from pathlib import Path

import joblib
import pandas as pd
from xgboost import XGBClassifier

from app.config import settings

MODEL_PATH = Path(settings.models_dir) / "dropout_classifier.pkl"

FEATURE_NAMES = [
    "attendance_30d",
    "attendance_90d",
    "attendance_trend",
    "marks_trend",
    "marks_avg_vs_batch",
    "failed_exams_count",
    "fee_delay_avg_days",
    "days_since_last_payment",
    "overdue_installments",
    "assignment_submission_rate",
    "video_watch_rate",
    "days_since_last_login",
    "retest_count",
    "late_attendance_count",
    "excused_absences_count",
    "has_fee_discount",
    "days_since_enrollment",
    "batch_dropout_rate",
]


def train_model(X: pd.DataFrame, y: pd.Series, save: bool = True) -> XGBClassifier:
    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X[FEATURE_NAMES], y)

    if save:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)

    return model


def load_model() -> XGBClassifier | None:
    if not MODEL_PATH.exists():
        return None
    return joblib.load(MODEL_PATH)


def predict_risk(features: dict[str, float]) -> dict:
    model = load_model()
    if model is None:
        return {
            "available": False,
            "reason": "Model not trained yet. Run training endpoint first.",
        }

    df = pd.DataFrame([features])[FEATURE_NAMES]
    prob = float(model.predict_proba(df)[0][1])
    risk_score = int(prob * 100)

    importances = model.feature_importances_
    feature_contributions = []
    for name, importance, value in zip(FEATURE_NAMES, importances, df.iloc[0].values):
        feature_contributions.append(
            {
                "feature": name,
                "value": float(value),
                "importance": float(importance),
                "contribution": float(importance * abs(value)),
            }
        )
    feature_contributions.sort(key=lambda x: x["contribution"], reverse=True)
    top_factors = feature_contributions[:5]

    if risk_score >= 70:
        level = "high"
    elif risk_score >= 40:
        level = "medium"
    else:
        level = "low"

    if risk_score >= 70:
        suggestion = (
            "Immediate intervention: schedule parent meeting this week"
        )
    elif risk_score >= 40:
        suggestion = (
            "Monitor closely: send encouragement message + track attendance"
        )
    else:
        suggestion = "Continue current engagement"

    return {
        "available": True,
        "risk_score": risk_score,
        "probability": round(prob, 4),
        "level": level,
        "top_factors": top_factors,
        "suggestion": suggestion,
    }
