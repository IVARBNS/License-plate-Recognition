# License Plate Recognition & Vehicle Tracking System

A web-based computer vision system for real-time vehicle detection, tracking, and license plate recognition using YOLO, SORT, and EasyOCR.

## Features

- **Vehicle Detection**: Detects cars, motorcycles, buses, and trucks using YOLOv8
- **Multi-Object Tracking**: Tracks vehicles across frames using SORT algorithm
- **License Plate Recognition**: Extracts license plate text using EasyOCR
- **Real-time Video Processing**: Stream video frames with live annotations via SSE
- **Image Processing**: Upload and process single images
- **Video Saving**: Save processed videos with timestamp filenames
- **Blacklist Alerts**: Get notified when blacklisted plates are detected
- **Confidence Filtering**: Filter detection results by confidence threshold

## Visual Annotations

The system draws rich annotations on detected vehicles:

- **Green corner borders** around vehicles (red for blacklisted)
- **Red rectangle** around license plates
- **Enlarged license plate crop** displayed above the vehicle
- **White text box** with recognized plate number

## Project Structure

```
├── backend/
│   ├── server.py           # Flask server with REST API & WebSocket
│   ├── utils.py            # OCR utilities (read_license_plate, get_car)
│   ├── visualize.py        # Drawing utilities (draw_border)
│   ├── requirements.txt    # Python dependencies
│   ├── models/
│   │   ├── yolov8n.pt              # Vehicle detection model
│   │   └── license_plate_detector.pt # License plate detection model
│   ├── data/
│   │   ├── blacklist.json  # Blacklisted plates
│   │   └── out_*.mp4       # Processed video outputs
│   └── sort/
│       └── sort.py         # SORT tracking algorithm
│
└── frontend/
    ├── package.json
    └── src/
        ├── App.js          # Main React application
        ├── App.css
        └── components/
            ├── ControlPanel.js     # Upload controls
            ├── VideoDisplay.js     # Video/image display
            ├── ResultsPanel.js     # Detection results
            ├── AlertsPanel.js      # Blacklist alerts
            ├── BlacklistPanel.js   # Blacklist management
            └── SearchPanel.js      # Confidence filter
```

## Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
```

**Requirements:**

- Python 3.8+
- CUDA-capable GPU (recommended for real-time performance)

### Frontend

```bash
cd frontend
npm install
```

## Running the Application

### 1. Start Backend Server

```bash
cd backend
python server.py
```

Server runs on `http://localhost:5000`

### 2. Start Frontend

```bash
cd frontend
npm start
```

Frontend runs on `http://localhost:3000`

## Usage

### Image Processing

1. Click "Upload Image" and select an image file
2. The processed image with annotations will display in the feed
3. Detection results appear in the Results panel

### Video Processing

1. Click "Upload Video" and select a video file
2. Video streams in real-time with live annotations
3. Use "Stop" to halt processing at any time
4. After processing, click "Save Video" to download or "Dismiss" to delete

### Blacklist Management

1. Enter a license plate number in the Blacklist panel
2. Click "Add" to add it to the blacklist
3. Blacklisted plates trigger alerts and are highlighted in red

### Filtering Results

- Adjust the "Min Confidence" slider to filter low-confidence detections

## API Reference

### Health Check

```
GET /api/health
```

### Image Processing

```
POST /api/process-image
Body: { "image": "base64_encoded_image" }
Response: { "image": "base64_annotated_image", "results": [...] }
```

### Video Processing

```
POST /api/upload-video
Body: { "video": "base64_encoded_video" }
Response: { "session_id": "uuid", "fps": 30, "total_frames": 100 }

GET /api/stream-video/<session_id>
Response: Server-Sent Events stream of processed frames

POST /api/stop-video/<session_id>
Response: { "status": "stopped" }
```

### Video Download

```
GET /api/download-video/<filename>
Response: Video file download

DELETE /api/delete-video/<filename>
Response: { "status": "deleted" }
```

### Blacklist Management

```
GET /api/blacklist
Response: { "blacklist": ["PLATE1", "PLATE2"] }

POST /api/blacklist
Body: { "plate": "ABC1234" }
Response: { "blacklist": [...] }

DELETE /api/blacklist/<plate>
Response: { "blacklist": [...] }
```

## Data

The video I used in this tutorial can be downloaded [here](https://www.pexels.com/video/traffic-flow-in-the-highway-2103099/).

The sort module needs to be downloaded from this [repository](https://github.com/abewley/sort).

## Models

Place YOLO models in `backend/models/`:

| Model                       | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `yolov8n.pt`                | Vehicle detection (COCO classes 2,3,5,7) |
| `license_plate_detector.pt` | License plate detection                  |

## Technologies

- **Backend**: Flask, Flask-SocketIO, OpenCV, Ultralytics YOLO, EasyOCR
- **Frontend**: React, Socket.IO Client
- **Tracking**: SORT (Simple Online and Realtime Tracking)
- **Streaming**: Server-Sent Events (SSE)

## License Plate Format

The system validates license plates in the format: `AA00AAA` (2 letters, 2 digits, 3 letters)

Characters are normalized to handle common OCR errors:

- `O` ↔ `0`, `I` ↔ `1`, `J` ↔ `3`, `A` ↔ `4`, `G` ↔ `6`, `S` ↔ `5`
