from pathlib import Path

from fastapi import APIRouter, Depends

from app.auth import verify_internal_key
from app.config import settings
from app.features.synthetic import (
    generate_synthetic_dropout_data,
    generate_synthetic_performance_data,
)
from app.models.dropout_classifier import train_model as train_dropout
from app.models.performance_regressor import train_model as train_perf

router = APIRouter(dependencies=[Depends(verify_internal_key)])


@router.post("/dropout/bootstrap")
async def bootstrap_dropout():
    X, y = generate_synthetic_dropout_data(n_samples=2000)
    train_dropout(X, y)
    return {
        "ok": True,
        "data": {
            "message": "Dropout classifier trained on synthetic data",
            "samples": len(X),
            "feature_count": len(X.columns),
            "model_path": "app/models/trained/dropout_classifier.pkl",
        },
    }


@router.post("/performance/bootstrap")
async def bootstrap_performance():
    X, y = generate_synthetic_performance_data(n_samples=2000)
    train_perf(X, y)
    return {
        "ok": True,
        "data": {
            "message": "Performance regressor trained on synthetic data",
            "samples": len(X),
            "feature_count": len(X.columns),
        },
    }


@router.get("/models/status")
async def status():
    models_dir = Path(settings.models_dir)
    return {
        "ok": True,
        "data": {
            "dropout_classifier": (models_dir / "dropout_classifier.pkl").exists(),
            "performance_regressor": (
                models_dir / "performance_regressor.pkl"
            ).exists(),
        },
    }
