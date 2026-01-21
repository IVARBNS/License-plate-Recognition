"""
Visualization utilities for drawing annotations on frames.
"""

import cv2


def draw_border(
    img,
    top_left,
    bottom_right,
    color=(0, 255, 0),
    thickness=10,
    line_length_x=200,
    line_length_y=200,
):
    """
    Draw corner borders around a bounding box.

    Args:
        img: Image to draw on.
        top_left: Tuple (x1, y1) for top-left corner.
        bottom_right: Tuple (x2, y2) for bottom-right corner.
        color: BGR color tuple.
        thickness: Line thickness.
        line_length_x: Length of horizontal corner lines.
        line_length_y: Length of vertical corner lines.

    Returns:
        Image with drawn borders.
    """
    x1, y1 = top_left
    x2, y2 = bottom_right

    # Top-left corner
    cv2.line(img, (x1, y1), (x1, y1 + line_length_y), color, thickness)
    cv2.line(img, (x1, y1), (x1 + line_length_x, y1), color, thickness)

    # Bottom-left corner
    cv2.line(img, (x1, y2), (x1, y2 - line_length_y), color, thickness)
    cv2.line(img, (x1, y2), (x1 + line_length_x, y2), color, thickness)

    # Top-right corner
    cv2.line(img, (x2, y1), (x2 - line_length_x, y1), color, thickness)
    cv2.line(img, (x2, y1), (x2, y1 + line_length_y), color, thickness)

    # Bottom-right corner
    cv2.line(img, (x2, y2), (x2, y2 - line_length_y), color, thickness)
    cv2.line(img, (x2, y2), (x2 - line_length_x, y2), color, thickness)

    return img
