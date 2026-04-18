from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import verify_internal_key
from app.features.extractor import extract_dropout_features
from app.models.dropout_classifier import predict_risk

router = APIRouter(dependencies=[Depends(verify_internal_key)])


class DropoutRequest(BaseModel):
    tenant_id: str
    student_id: str


class BatchDropoutRequest(BaseModel):
    tenant_id: str
    student_ids: list[str]


@router.post("/predict")
async def predict_dropout(body: DropoutRequest):
    features = await extract_dropout_features(body.tenant_id, body.student_id)
    result = predict_risk(features)
    return {
        "ok": True,
        "data": {
            "student_id": body.student_id,
            "features": features,
            **result,
        },
    }


@router.post("/predict-batch")
async def predict_dropout_batch(body: BatchDropoutRequest):
    results = []
    for student_id in body.student_ids:
        features = await extract_dropout_features(body.tenant_id, student_id)
        prediction = predict_risk(features)
        results.append({"student_id": student_id, **prediction})
    return {"ok": True, "data": results}
