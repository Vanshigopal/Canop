from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor

from app.config import settings

MODEL_PATH = Path(settings.models_dir) / "performance_regressor.pkl"

FEATURE_NAMES = [
    "recent_avg_percentage",
    "subject_avg_percentage",
    "attendance_90d",
    "marks_trend",
    "batch_avg_last_exam",
    "days_since_last_exam",
    "study_material_access_rate",
    "assignment_submission_rate",
    "video_watch_rate",
    "last_exam_percentage",
    "exam_count",
    "subject_exam_count",
]


def train_model(
    X: pd.DataFrame, y: pd.Series, save: bool = True
) -> GradientBoostingRegressor:
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X[FEATURE_NAMES], y)

    if save:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)

    return model


def load_model() -> GradientBoostingRegressor | None:
    if not MODEL_PATH.exists():
        return None
    return joblib.load(MODEL_PATH)


def predict_performance(features: dict[str, float]) -> dict:
    model = load_model()
    if model is None:
        return {
            "available": False,
            "reason": "Model not trained yet.",
        }

    df = pd.DataFrame([features])[FEATURE_NAMES]
    predicted_pct = float(model.predict(df)[0])

    # Approximate confidence via predictions from staged boosting trees
    staged = list(model.staged_predict(df))
    if len(staged) >= 5:
        tail = np.array([float(s[0]) for s in staged[-min(50, len(staged)) :]])
        std = float(np.std(tail))
    else:
        std = 8.0

    lower_bound = max(0.0, predicted_pct - 1.28 * std)
    upper_bound = min(100.0, predicted_pct + 1.28 * std)

    return {
        "available": True,
        "predicted_percentage": round(predicted_pct, 2),
        "confidence_interval": {
            "lower": round(lower_bound, 2),
            "upper": round(upper_bound, 2),
            "level": "80%",
        },
        "confidence": "medium" if std < 10 else "low",
    }
