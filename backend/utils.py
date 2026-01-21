"""
Utility functions for license plate recognition.
"""

import string
import easyocr

# Initialize the OCR reader
reader = easyocr.Reader(["en"], gpu=True)

# Mapping dictionaries for character conversion
dict_char_to_int = {"O": "0", "I": "1", "J": "3", "A": "4", "G": "6", "S": "5"}
dict_int_to_char = {"0": "O", "1": "I", "3": "J", "4": "A", "6": "G", "5": "S"}


def license_complies_format(text):
    """
    Check if the license plate text complies with the required format.

    Args:
        text (str): License plate text.

    Returns:
        bool: True if the license plate complies with the format, False otherwise.
    """
    if len(text) != 7:
        return False

    if (
        (text[0] in string.ascii_uppercase or text[0] in dict_int_to_char.keys())
        and (text[1] in string.ascii_uppercase or text[1] in dict_int_to_char.keys())
        and (text[2] in "0123456789" or text[2] in dict_char_to_int.keys())
        and (text[3] in "0123456789" or text[3] in dict_char_to_int.keys())
        and (text[4] in string.ascii_uppercase or text[4] in dict_int_to_char.keys())
        and (text[5] in string.ascii_uppercase or text[5] in dict_int_to_char.keys())
        and (text[6] in string.ascii_uppercase or text[6] in dict_int_to_char.keys())
    ):
        return True
    return False


def format_license(text):
    """
    Format the license plate text by converting characters using the mapping dictionaries.

    Args:
        text (str): License plate text.

    Returns:
        str: Formatted license plate text.
    """
    license_plate_ = ""
    mapping = {
        0: dict_int_to_char,
        1: dict_int_to_char,
        2: dict_char_to_int,
        3: dict_char_to_int,
        4: dict_int_to_char,
        5: dict_int_to_char,
        6: dict_int_to_char,
    }
    for j in range(7):
        if text[j] in mapping[j].keys():
            license_plate_ += mapping[j][text[j]]
        else:
            license_plate_ += text[j]

    return license_plate_


def read_license_plate(license_plate_crop):
    """
    Read the license plate text from the given cropped image.

    Args:
        license_plate_crop: Cropped image containing the license plate.

    Returns:
        tuple: Tuple containing the formatted license plate text and its confidence score.
    """
    detections = reader.readtext(license_plate_crop)

    for detection in detections:
        bbox, text, score = detection
        text = text.upper().replace(" ", "")

        if license_complies_format(text):
            return format_license(text), score

    return None, None


def get_car(license_plate, vehicle_track_ids):
    """
    Retrieve the vehicle coordinates and ID based on the license plate coordinates.

    Args:
        license_plate (tuple): Tuple containing the coordinates of the license plate.
        vehicle_track_ids (list): List of vehicle track IDs and their corresponding coordinates.

    Returns:
        tuple: Tuple containing the vehicle coordinates (x1, y1, x2, y2) and ID.
    """
    x1, y1, x2, y2, score, _ = license_plate

    for j in range(len(vehicle_track_ids)):
        xcar1, ycar1, xcar2, ycar2, car_id = vehicle_track_ids[j]

        # Check if license plate is within vehicle bbox
        if (x1 >= xcar1 and y1 >= ycar1) and (x2 <= xcar2 and y2 <= ycar2):
            return vehicle_track_ids[j]

    return -1, -1, -1, -1, -1
