from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import verify_internal_key
from app.features.extractor import extract_performance_features
from app.models.performance_regressor import predict_performance

router = APIRouter(dependencies=[Depends(verify_internal_key)])


class PerformanceRequest(BaseModel):
    tenant_id: str
    student_id: str
    subject_id: str


@router.post("/predict")
async def predict(body: PerformanceRequest):
    features = await extract_performance_features(
        body.tenant_id, body.student_id, body.subject_id
    )
    result = predict_performance(features)
    return {
        "ok": True,
        "data": {
            "student_id": body.student_id,
            "subject_id": body.subject_id,
            "features": features,
            **result,
        },
    }
