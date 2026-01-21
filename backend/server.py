"""
Flask-SocketIO server for License Plate Recognition Web App
Uses existing modules: utils.py, visualize.py, sort/sort.py
"""

from flask import Flask, request, jsonify, Response, send_file
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO
from sort.sort import Sort
from utils import get_car, read_license_plate
from visualize import draw_border
import json
import os
import base64
import time
from datetime import datetime
import uuid
import torch

USE_GPU = True
DEVICE = "cuda" if USE_GPU and torch.cuda.is_available() else "cpu"

# Load models
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"Using device: {DEVICE}")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Load models
print("Loading models...")
coco_model = YOLO("models/yolov8n.pt")
license_plate_model = YOLO("models/license_plate_detector.pt")
print("Models loaded!")

# Global state
video_sessions = {}
blacklist_file = "data/blacklist.json"

# Vehicle class mapping (COCO dataset classes 2, 3, 5, 7)
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Initialize data directory and blacklist
os.makedirs("data", exist_ok=True)
if not os.path.exists(blacklist_file):
    with open(blacklist_file, "w") as f:
        json.dump([], f)


def load_blacklist():
    """Load blacklist from JSON file"""
    try:
        with open(blacklist_file, "r") as f:
            return json.load(f)
    except:
        return []


def save_blacklist(blacklist):
    """Save blacklist to JSON file"""
    with open(blacklist_file, "w") as f:
        json.dump(blacklist, f, indent=2)


def process_frame(frame, tracker, vehicle_history, frame_number=0):
    """Process a single frame for vehicle detection and license plate recognition."""

    # Detect vehicles (classes 2, 3, 5, 7)
    detections = coco_model(frame, classes=[2, 3, 5, 7], verbose=False, device=DEVICE)[
        0
    ]
    detections_ = []
    vehicle_types = {}

    for det in detections.boxes.data.tolist():
        x1, y1, x2, y2, conf, cls = det
        detections_.append([x1, y1, x2, y2, conf])
        vehicle_types[len(detections_) - 1] = VEHICLE_CLASSES.get(int(cls), "unknown")

    # Track vehicles
    if detections_:
        track_ids = tracker.update(np.asarray(detections_))
    else:
        track_ids = np.empty((0, 5))

    # Detect license plates
    license_plates = license_plate_model(frame, verbose=False, device=DEVICE)[0]

    frame_results = []
    blacklist = load_blacklist()

    for license_plate in license_plates.boxes.data.tolist():
        x1, y1, x2, y2, score, _ = license_plate

        # Assign license plate to vehicle
        xcar1, ycar1, xcar2, ycar2, car_id = get_car(license_plate, track_ids)

        if car_id != -1:
            # Crop license plate
            license_plate_crop = frame[int(y1) : int(y2), int(x1) : int(x2)]

            if license_plate_crop.size == 0:
                continue

            # Process cropped license plate
            license_plate_crop_gray = cv2.cvtColor(
                license_plate_crop, cv2.COLOR_BGR2GRAY
            )
            _, license_plate_crop_thresh = cv2.threshold(
                license_plate_crop_gray, 64, 255, cv2.THRESH_BINARY_INV
            )

            # Read license plate
            license_plate_text, license_plate_text_score = read_license_plate(
                license_plate_crop_thresh
            )

            if license_plate_text is not None:
                # Check if blacklisted
                is_blacklisted = bool(
                    license_plate_text.upper() in [b.upper() for b in blacklist]
                )

                result = {
                    "car_id": int(car_id),
                    "car_bbox": [
                        float(xcar1),
                        float(ycar1),
                        float(xcar2),
                        float(ycar2),
                    ],
                    "license_plate_bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "license_plate_text": str(license_plate_text),
                    "license_plate_confidence": float(score),
                    "text_confidence": (
                        float(license_plate_text_score)
                        if license_plate_text_score
                        else 0.0
                    ),
                    "vehicle_type": str(vehicle_types.get(0, "unknown")),
                    "is_blacklisted": is_blacklisted,
                    "timestamp": datetime.now().isoformat(),
                    "frame_number": int(frame_number),
                }

                frame_results.append(result)

    return frame_results


def draw_annotations(frame, results):
    """Draw annotations on frame matching visualize.py style."""
    annotated_frame = frame.copy()

    for result in results:
        car_x1, car_y1, car_x2, car_y2 = result["car_bbox"]
        car_x1, car_y1, car_x2, car_y2 = (
            int(car_x1),
            int(car_y1),
            int(car_x2),
            int(car_y2),
        )

        # Red for blacklisted, green othwerwise
        color = (0, 0, 255) if result.get("is_blacklisted") else (0, 255, 0)

        # Draw vehicle bbox
        draw_border(
            annotated_frame, (car_x1, car_y1), (car_x2, car_y2), color, 25, 200, 200
        )

        # Draw license plate bbox
        lp_x1, lp_y1, lp_x2, lp_y2 = result["license_plate_bbox"]
        lp_x1, lp_y1, lp_x2, lp_y2 = int(lp_x1), int(lp_y1), int(lp_x2), int(lp_y2)
        cv2.rectangle(annotated_frame, (lp_x1, lp_y1), (lp_x2, lp_y2), (0, 0, 255), 12)

        # Get license plate text
        license_text = result.get("license_plate_text", "")

        try:
            # Crop license plate from original frame
            license_crop = frame[lp_y1:lp_y2, lp_x1:lp_x2, :]

            if license_crop.size > 0:
                # Resize license plate crop
                lp_height = lp_y2 - lp_y1
                lp_width = lp_x2 - lp_x1
                if lp_height > 0:
                    new_height = 400
                    new_width = int(lp_width * new_height / lp_height)
                    license_crop = cv2.resize(license_crop, (new_width, new_height))

                    H, W = license_crop.shape[:2]

                    # Calculate position above car
                    top_y = car_y1 - H - 100
                    left_x = int((car_x2 + car_x1 - W) / 2)
                    right_x = int((car_x2 + car_x1 + W) / 2)

                    # Check bounds
                    if (
                        top_y >= 0
                        and left_x >= 0
                        and right_x <= annotated_frame.shape[1]
                    ):
                        # Place license plate crop above car
                        annotated_frame[top_y : top_y + H, left_x:right_x, :] = (
                            license_crop
                        )

                        # Draw license plate text above the crop
                        text_bg_top = top_y - 300
                        text_bg_bottom = top_y

                        if text_bg_top >= 0:
                            annotated_frame[
                                text_bg_top:text_bg_bottom, left_x:right_x, :
                            ] = (255, 255, 255)

                            # Draw license plate text on white background
                            (text_width, text_height), _ = cv2.getTextSize(
                                license_text,
                                cv2.FONT_HERSHEY_SIMPLEX,
                                4.3,
                                17,
                            )

                            text_x = int((car_x2 + car_x1 - text_width) / 2)
                            text_y = int(text_bg_top + 150 + (text_height / 2))

                            cv2.putText(
                                annotated_frame,
                                license_text,
                                (text_x, text_y),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                4.3,
                                (0, 0, 0),
                                17,
                            )
        except Exception:
            # If annotation fails, just continue without the overlay
            pass

    return annotated_frame


def frame_to_base64(frame):
    """Convert OpenCV frame to base64 string"""
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buffer).decode("utf-8")


# ==================== REST API Endpoints ====================


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


@app.route("/api/process-image", methods=["POST"])
def api_process_image():
    """Process a single image"""
    try:
        data = request.get_json()
        image_data = data.get("image")

        if not image_data:
            return jsonify({"error": "No image data provided"}), 400

        if "," in image_data:
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"error": "Failed to decode image"}), 400

        tracker = Sort()
        vehicle_history = {}
        results = process_frame(frame, tracker, vehicle_history, frame_number=0)
        annotated_frame = draw_annotations(frame, results)
        frame_base64 = frame_to_base64(annotated_frame)

        return jsonify(
            {"image": f"data:image/jpeg;base64,{frame_base64}", "results": results}
        )

    except Exception as e:
        print(f"Error processing image: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload-video", methods=["POST"])
def api_upload_video():
    """Upload a video for processing"""
    try:
        data = request.get_json()
        video_data = data.get("video")

        if not video_data:
            return jsonify({"error": "No video data provided"}), 400

        if "," in video_data:
            video_data = video_data.split(",")[1]

        video_bytes = base64.b64decode(video_data)

        session_id = str(uuid.uuid4())
        video_path = f"data/video_{session_id}.mp4"

        with open(video_path, "wb") as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        # Generate output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"data/out_{timestamp}.mp4"

        video_sessions[session_id] = {
            "path": video_path,
            "output_path": output_path,
            "fps": fps,
            "width": width,
            "height": height,
            "total_frames": total_frames,
            "active": True,
            "output_ready": False,
        }

        print(f"Video uploaded: {session_id}, {total_frames} frames")

        return jsonify(
            {"session_id": session_id, "fps": fps, "total_frames": total_frames}
        )

    except Exception as e:
        print(f"Error uploading video: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/stream-video/<session_id>")
def api_stream_video(session_id):
    """Stream processed video frames using Server-Sent Events"""

    if session_id not in video_sessions:
        return jsonify({"error": "Session not found"}), 404

    session = video_sessions[session_id]
    video_path = session["path"]
    output_path = session["output_path"]
    fps = session["fps"]
    width = session["width"]
    height = session["height"]

    def generate():
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            yield f"data: {json.dumps({'error': 'Failed to open video'})}\n\n"
            return

        # Create video writer for output
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        tracker = Sort()
        vehicle_history = {}
        frame_number = 0
        frame_delay = 1.0 / min(fps, 15)

        try:
            while session.get("active", True):
                ret, frame = cap.read()
                if not ret:
                    break

                results = process_frame(frame, tracker, vehicle_history, frame_number)
                annotated_frame = draw_annotations(frame, results)

                # Write annotated frame to output video
                out.write(annotated_frame)

                frame_base64 = frame_to_base64(annotated_frame)

                frame_data = {
                    "type": "frame",
                    "frame": f"data:image/jpeg;base64,{frame_base64}",
                    "frame_number": frame_number,
                    "results": results,
                }

                yield f"data: {json.dumps(frame_data)}\n\n"

                frame_number += 1
                time.sleep(frame_delay)

            # Mark output as ready
            session["output_ready"] = True
            session["processed_frames"] = frame_number

            # Get output filename for download
            output_filename = os.path.basename(output_path)

            yield f"data: {json.dumps({'type': 'complete', 'total_frames': frame_number, 'output_file': output_filename})}\n\n"

        finally:
            cap.release()
            out.release()

            # Remove input video, keep output
            if os.path.exists(video_path):
                os.remove(video_path)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.route("/api/stop-video/<session_id>", methods=["POST"])
def api_stop_video(session_id):
    """Stop video processing"""
    if session_id in video_sessions:
        video_sessions[session_id]["active"] = False
        return jsonify({"status": "stopped"})
    return jsonify({"error": "Session not found"}), 404


@app.route("/api/download-video/<filename>")
def api_download_video(filename):
    """Download processed video"""
    file_path = os.path.join("data", filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(
        file_path, mimetype="video/mp4", as_attachment=True, download_name=filename
    )


@app.route("/api/delete-video/<filename>", methods=["DELETE"])
def api_delete_video(filename):
    """Delete processed video"""
    file_path = os.path.join("data", filename)

    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({"status": "deleted"})
    return jsonify({"error": "File not found"}), 404


@app.route("/api/blacklist", methods=["GET"])
def api_get_blacklist():
    return jsonify({"blacklist": load_blacklist()})


@app.route("/api/blacklist", methods=["POST"])
def api_add_to_blacklist():
    data = request.get_json()
    plate = data.get("plate", "").upper().strip()

    if not plate:
        return jsonify({"error": "Plate number required"}), 400

    blacklist = load_blacklist()
    if plate not in blacklist:
        blacklist.append(plate)
        save_blacklist(blacklist)

    return jsonify({"blacklist": blacklist})


@app.route("/api/blacklist/<plate>", methods=["DELETE"])
def api_remove_from_blacklist(plate):
    plate = plate.upper().strip()
    blacklist = load_blacklist()

    if plate in blacklist:
        blacklist.remove(plate)
        save_blacklist(blacklist)
        return jsonify({"blacklist": blacklist})
    return jsonify({"error": "Plate not found"}), 404


# ==================== WebSocket Event Handlers ====================


@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("connected", {"message": "Connected"})


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


@socketio.on("get_blacklist")
def handle_get_blacklist():
    emit("blacklist", {"blacklist": load_blacklist()})


@socketio.on("add_to_blacklist")
def handle_add_to_blacklist(data):
    plate = data.get("plate", "").upper().strip()
    if not plate:
        emit("error", {"message": "Plate number required"})
        return

    blacklist = load_blacklist()
    if plate not in blacklist:
        blacklist.append(plate)
        save_blacklist(blacklist)

    emit("blacklist", {"blacklist": blacklist})


@socketio.on("remove_from_blacklist")
def handle_remove_from_blacklist(data):
    plate = data.get("plate", "").upper().strip()
    blacklist = load_blacklist()

    if plate in blacklist:
        blacklist.remove(plate)
        save_blacklist(blacklist)
        emit("blacklist", {"blacklist": blacklist})
    else:
        emit("error", {"message": "Plate not found"})


# ==================== Main ====================


if __name__ == "__main__":
    print("License Plate Recognition Server")
    print(f"Blacklist file: {blacklist_file}")
    print("Running at http://localhost:5000")
    socketio.run(
        app, debug=False, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True
    )
