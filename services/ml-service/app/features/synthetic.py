import numpy as np
import pandas as pd


def generate_synthetic_dropout_data(
    n_samples: int = 2000,
) -> tuple[pd.DataFrame, pd.Series]:
    """
    Generate synthetic training data for the dropout classifier.

    Each feature is sampled from a plausible distribution; the "true" dropout
    probability is a weighted sum of the most telling signals, then passed
    through a logistic to produce labels.
    """
    rng = np.random.default_rng(42)

    data = {
        "attendance_30d": rng.beta(5, 2, n_samples) * 100,
        "attendance_90d": rng.beta(5, 2, n_samples) * 100,
        "attendance_trend": rng.normal(0, 0.5, n_samples).clip(-1, 1),
        "marks_trend": rng.normal(0, 0.5, n_samples).clip(-1, 1),
        "marks_avg_vs_batch": rng.normal(0, 15, n_samples),
        "failed_exams_count": rng.poisson(0.5, n_samples),
        "fee_delay_avg_days": rng.exponential(5, n_samples),
        "days_since_last_payment": rng.exponential(30, n_samples),
        "overdue_installments": rng.poisson(0.3, n_samples),
        "assignment_submission_rate": rng.beta(3, 1, n_samples),
        "video_watch_rate": rng.beta(2, 1, n_samples),
        "days_since_last_login": rng.exponential(4, n_samples),
        "retest_count": rng.poisson(0.4, n_samples),
        "late_attendance_count": rng.poisson(1.5, n_samples),
        "excused_absences_count": rng.poisson(0.5, n_samples),
        "has_fee_discount": rng.binomial(1, 0.2, n_samples),
        "days_since_enrollment": rng.exponential(120, n_samples),
        "batch_dropout_rate": rng.beta(1.5, 8, n_samples),
    }
    df = pd.DataFrame(data)

    risk = (
        -0.03 * df["attendance_30d"]
        - 0.02 * df["attendance_90d"]
        - 1.5 * df["attendance_trend"]
        - 1.5 * df["marks_trend"]
        - 0.02 * df["marks_avg_vs_batch"]
        + 0.5 * df["failed_exams_count"]
        + 0.05 * df["fee_delay_avg_days"]
        + 0.01 * df["days_since_last_payment"]
        + 1.0 * df["overdue_installments"]
        - 2.0 * df["assignment_submission_rate"]
        + 0.1 * df["days_since_last_login"]
        + 0.5 * df["retest_count"]
        + 10 * df["batch_dropout_rate"]
        + rng.normal(0, 2, n_samples)
    )

    prob = 1 / (1 + np.exp(-risk / 5))
    y = rng.binomial(1, prob)
    return df, pd.Series(y, name="dropped_out")


def generate_synthetic_performance_data(
    n_samples: int = 2000,
) -> tuple[pd.DataFrame, pd.Series]:
    rng = np.random.default_rng(42)

    data = {
        "recent_avg_percentage": rng.normal(65, 15, n_samples).clip(10, 100),
        "subject_avg_percentage": rng.normal(65, 15, n_samples).clip(10, 100),
        "attendance_90d": rng.beta(5, 2, n_samples) * 100,
        "marks_trend": rng.normal(0, 0.4, n_samples).clip(-1, 1),
        "batch_avg_last_exam": rng.normal(60, 10, n_samples).clip(20, 90),
        "days_since_last_exam": rng.exponential(30, n_samples).clip(1, 180),
        "study_material_access_rate": rng.beta(2, 2, n_samples),
        "assignment_submission_rate": rng.beta(3, 1, n_samples),
        "video_watch_rate": rng.beta(2, 1, n_samples),
        "last_exam_percentage": rng.normal(60, 15, n_samples).clip(0, 100),
        "exam_count": rng.poisson(5, n_samples),
        "subject_exam_count": rng.poisson(3, n_samples),
    }
    df = pd.DataFrame(data)

    y = (
        0.4 * df["recent_avg_percentage"]
        + 0.3 * df["subject_avg_percentage"]
        + 0.1 * df["attendance_90d"]
        + 8 * df["marks_trend"]
        + rng.normal(0, 4, n_samples)
    ).clip(0, 100)

    return df, pd.Series(y, name="next_exam_percentage")
