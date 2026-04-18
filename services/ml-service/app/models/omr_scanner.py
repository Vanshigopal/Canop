from dataclasses import dataclass

import cv2
import numpy as np

from app.config import settings


@dataclass
class BubbleResult:
    question_number: int
    selected_option: int | None  # 1-4 for A-D, None if blank/uncertain
    confidence: float
    filled_ratio: float


@dataclass
class OMRResult:
    total_questions: int
    correct: int
    incorrect: int
    unattempted: int
    responses: list[BubbleResult]
    roll_number: str | None
    score: float | None
    positive_marks: float | None
    negative_marks: float | None
    flagged_questions: list[int]


def scan_omr_sheet(
    image_bytes: bytes,
    answer_key: dict[int, int],
    total_questions: int,
    marks_per_correct: float,
    marks_per_wrong: float,
    marks_per_unattempted: float,
) -> OMRResult:
    """
    Scan an OMR sheet image and return per-question responses + score.

    Pipeline:
      1. Decode image
      2. Grayscale, blur, threshold (adaptive)
      3. Find bubble-shaped contours
      4. Group into questions (4 per row)
      5. Compute filled-ratio per bubble, pick the most-filled per question
      6. Apply answer key and marking scheme
    """
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image data")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15,
        5,
    )

    contours, _ = cv2.findContours(
        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    bubbles: list[tuple[int, int, int, int]] = []
    for c in contours:
        area = cv2.contourArea(c)
        if settings.bubble_min_area <= area <= settings.bubble_max_area:
            x, y, w, h = cv2.boundingRect(c)
            if h == 0:
                continue
            aspect_ratio = w / h
            if 0.7 <= aspect_ratio <= 1.3:
                bubbles.append((x, y, w, h))

    # Sort top-to-bottom (row tolerance), then left-to-right
    bubbles.sort(key=lambda b: (b[1] // 30, b[0]))

    responses: list[BubbleResult] = []
    flagged: list[int] = []

    for q_num in range(1, total_questions + 1):
        start_idx = (q_num - 1) * 4
        end_idx = start_idx + 4

        if end_idx > len(bubbles):
            flagged.append(q_num)
            responses.append(BubbleResult(q_num, None, 0.0, 0.0))
            continue

        q_bubbles = bubbles[start_idx:end_idx]
        filled_ratios: list[float] = []
        for x, y, w, h in q_bubbles:
            roi = thresh[y : y + h, x : x + w]
            filled = float(np.sum(roi > 0)) / max(1, roi.size)
            filled_ratios.append(filled)

        max_ratio = max(filled_ratios)
        sorted_ratios = sorted(filled_ratios, reverse=True)
        margin = (
            sorted_ratios[0] - sorted_ratios[1] if len(sorted_ratios) >= 2 else 0.0
        )
        confidence = float(min(1.0, margin * 3))

        if max_ratio < 0.35:
            responses.append(BubbleResult(q_num, None, 1.0, max_ratio))
        elif confidence < settings.omr_confidence_threshold:
            flagged.append(q_num)
            selected = int(np.argmax(filled_ratios)) + 1
            responses.append(
                BubbleResult(q_num, selected, confidence, max_ratio)
            )
        else:
            selected = int(np.argmax(filled_ratios)) + 1
            responses.append(
                BubbleResult(q_num, selected, confidence, max_ratio)
            )

    correct = 0
    incorrect = 0
    unattempted = 0
    for r in responses:
        if r.selected_option is None:
            unattempted += 1
        elif r.selected_option == answer_key.get(r.question_number):
            correct += 1
        else:
            incorrect += 1

    positive_marks = correct * marks_per_correct
    negative_marks = incorrect * marks_per_wrong  # expected to be <= 0
    unattempted_marks = unattempted * marks_per_unattempted
    score = positive_marks + negative_marks + unattempted_marks

    return OMRResult(
        total_questions=total_questions,
        correct=correct,
        incorrect=incorrect,
        unattempted=unattempted,
        responses=responses,
        roll_number=None,
        score=score,
        positive_marks=positive_marks,
        negative_marks=negative_marks,
        flagged_questions=flagged,
    )
