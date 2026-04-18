import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import verify_internal_key
from app.models.omr_scanner import scan_omr_sheet

router = APIRouter(dependencies=[Depends(verify_internal_key)])


@router.post("/scan")
async def scan_sheet(
    file: Annotated[UploadFile, File(...)],
    total_questions: Annotated[int, Form(...)],
    marks_per_correct: Annotated[float, Form(...)],
    marks_per_wrong: Annotated[float, Form(...)],
    answer_key_json: Annotated[str, Form(...)],
    marks_per_unattempted: Annotated[float, Form()] = 0.0,
):
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(400, f"Unsupported content type: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image too large (max 10MB)")

    try:
        answer_key = {
            int(k): int(v) for k, v in json.loads(answer_key_json).items()
        }
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(400, f"Invalid answer key JSON: {e}")

    result = scan_omr_sheet(
        image_bytes=image_bytes,
        answer_key=answer_key,
        total_questions=total_questions,
        marks_per_correct=marks_per_correct,
        marks_per_wrong=marks_per_wrong,
        marks_per_unattempted=marks_per_unattempted,
    )

    return {
        "ok": True,
        "data": {
            "total_questions": result.total_questions,
            "correct": result.correct,
            "incorrect": result.incorrect,
            "unattempted": result.unattempted,
            "score": result.score,
            "positive_marks": result.positive_marks,
            "negative_marks": result.negative_marks,
            "roll_number": result.roll_number,
            "responses": [
                {
                    "question_number": r.question_number,
                    "selected_option": r.selected_option,
                    "confidence": round(r.confidence, 3),
                    "filled_ratio": round(r.filled_ratio, 3),
                }
                for r in result.responses
            ],
            "flagged_questions": result.flagged_questions,
            "needs_review": len(result.flagged_questions) > 0,
        },
    }
