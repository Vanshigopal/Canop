import numpy as np

from app.db import get_pool


def _compute_trend(values: list[float]) -> float:
    """
    Compute trend slope normalized to -1..1 range.
    +1.0 = strong upward, 0.0 = flat/insufficient data, -1.0 = strong downward.
    """
    if len(values) < 2:
        return 0.0
    try:
        x = np.arange(len(values))
        y = np.array(values, dtype=float)
        slope = float(np.polyfit(x, y, 1)[0])
    except Exception:
        return 0.0
    # Normalize: ±2 percentage points per time-step counts as "strong"
    return max(-1.0, min(1.0, slope / 2.0))


async def extract_dropout_features(tenant_id: str, student_id: str) -> dict:
    """Extract all 18 dropout features for a student from live database data."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.fetchval(
                "SELECT set_config('app.current_tenant', $1, true)", tenant_id
            )

            # 1-2. Attendance last 30/90 days
            attendance = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(CASE WHEN ar.status = 'PRESENT' THEN 1.0 ELSE 0.0 END) FILTER
                        (WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'), 0) * 100 AS att_30d,
                    COALESCE(AVG(CASE WHEN ar.status = 'PRESENT' THEN 1.0 ELSE 0.0 END) FILTER
                        (WHERE s.date >= CURRENT_DATE - INTERVAL '90 days'), 0) * 100 AS att_90d
                FROM attendance_records ar
                JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.student_id = $1 AND s.type = 'LECTURE'
                """,
                student_id,
            )

            # 3. Attendance trend (slope over last 90 days, weekly)
            weekly_attendance = await conn.fetch(
                """
                SELECT
                    DATE_TRUNC('week', s.date) AS week,
                    AVG(CASE WHEN ar.status = 'PRESENT' THEN 1.0 ELSE 0.0 END) * 100 AS pct
                FROM attendance_records ar
                JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.student_id = $1 AND s.type = 'LECTURE'
                AND s.date >= CURRENT_DATE - INTERVAL '90 days'
                GROUP BY week
                ORDER BY week
                """,
                student_id,
            )
            attendance_trend = _compute_trend(
                [float(r["pct"]) for r in weekly_attendance if r["pct"] is not None]
            )

            # 4. Marks trend (slope over last 6 exams, oldest first)
            recent_exams = await conn.fetch(
                """
                SELECT me.percentage
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND me.is_absent = false
                AND e.status = 'PUBLISHED'
                ORDER BY e.exam_date DESC NULLS LAST
                LIMIT 6
                """,
                student_id,
            )
            exam_percentages = [
                float(r["percentage"])
                for r in reversed(recent_exams)
                if r["percentage"] is not None
            ]
            marks_trend = _compute_trend(exam_percentages)

            # 5. Marks avg vs batch (last 180 days)
            marks_comparison = await conn.fetchrow(
                """
                WITH student_avg AS (
                    SELECT COALESCE(AVG(me.percentage), 0) AS avg_pct
                    FROM mark_entries me
                    JOIN exams e ON e.id = me.exam_id
                    WHERE me.student_id = $1 AND me.is_absent = false
                    AND e.status = 'PUBLISHED'
                    AND me.entered_at >= CURRENT_DATE - INTERVAL '180 days'
                ),
                batch_info AS (
                    SELECT s.batch_id FROM students s WHERE s.id = $1
                ),
                batch_avg AS (
                    SELECT COALESCE(AVG(me.percentage), 0) AS avg_pct
                    FROM mark_entries me
                    JOIN exams e ON e.id = me.exam_id
                    JOIN students s2 ON s2.id = me.student_id
                    WHERE s2.batch_id = (SELECT batch_id FROM batch_info)
                    AND me.is_absent = false
                    AND e.status = 'PUBLISHED'
                    AND me.entered_at >= CURRENT_DATE - INTERVAL '180 days'
                )
                SELECT
                    (SELECT avg_pct FROM student_avg) AS student_avg,
                    (SELECT avg_pct FROM batch_avg) AS batch_avg
                """,
                student_id,
            )
            marks_avg_vs_batch = float(
                (marks_comparison["student_avg"] or 0)
                - (marks_comparison["batch_avg"] or 0)
            )

            # 6. Failed exams last 90 days
            failed_count = await conn.fetchval(
                """
                SELECT COALESCE(COUNT(*), 0)
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND me.is_passed = false
                AND me.is_absent = false
                AND e.status = 'PUBLISHED'
                AND me.entered_at >= CURRENT_DATE - INTERVAL '90 days'
                """,
                student_id,
            )

            # 7. Fee delay avg (days paid past due, last 365 days)
            fee_delay_avg = await conn.fetchval(
                """
                SELECT COALESCE(AVG(EXTRACT(DAY FROM p.paid_at - i.due_date)), 0)
                FROM payments p
                JOIN installments i ON i.id = p.installment_id
                JOIN student_fees sf ON sf.id = p.student_fee_id
                WHERE sf.student_id = $1
                AND p.status = 'SUCCESS'
                AND p.paid_at > i.due_date
                AND p.paid_at >= CURRENT_DATE - INTERVAL '365 days'
                """,
                student_id,
            )
            fee_delay_avg_days = max(0.0, float(fee_delay_avg or 0))

            # 8. Days since last successful payment
            last_payment = await conn.fetchval(
                """
                SELECT COALESCE(EXTRACT(DAY FROM NOW() - MAX(p.paid_at)), 365)
                FROM payments p
                JOIN student_fees sf ON sf.id = p.student_fee_id
                WHERE sf.student_id = $1 AND p.status = 'SUCCESS'
                """,
                student_id,
            )
            days_since_last_payment = float(last_payment or 365)

            # 9. Overdue installments
            overdue_count = await conn.fetchval(
                """
                SELECT COALESCE(COUNT(*), 0)
                FROM installments i
                JOIN student_fees sf ON sf.id = i.student_fee_id
                WHERE sf.student_id = $1 AND i.status = 'OVERDUE'
                """,
                student_id,
            )

            # 10-11. Assignment / video rates — Session 12 placeholders
            assignment_submission_rate = 0.5
            video_watch_rate = 0.5

            # 12. Days since last login
            last_login = await conn.fetchval(
                """
                SELECT COALESCE(EXTRACT(DAY FROM NOW() - MAX(u.last_login_at)), 365)
                FROM users u
                JOIN students s ON s.user_id = u.id
                WHERE s.id = $1
                """,
                student_id,
            )
            days_since_last_login = float(last_login or 365)

            # 13. Retest count last 90 days
            retest_count = await conn.fetchval(
                """
                SELECT COALESCE(COUNT(*), 0)
                FROM retests
                WHERE student_id = $1
                AND created_at >= CURRENT_DATE - INTERVAL '90 days'
                """,
                student_id,
            )

            # 14. Late attendance count (last 90 days)
            late_count = await conn.fetchval(
                """
                SELECT COALESCE(COUNT(*), 0)
                FROM attendance_records ar
                JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.student_id = $1
                AND ar.status = 'LATE'
                AND s.type = 'LECTURE'
                AND s.date >= CURRENT_DATE - INTERVAL '90 days'
                """,
                student_id,
            )

            # 15. Excused absences count (last 90 days)
            excused_count = await conn.fetchval(
                """
                SELECT COALESCE(COUNT(*), 0)
                FROM attendance_records ar
                JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.student_id = $1
                AND ar.status = 'EXCUSED'
                AND s.type = 'LECTURE'
                AND s.date >= CURRENT_DATE - INTERVAL '90 days'
                """,
                student_id,
            )

            # 16. Has fee discount (financial-stress proxy)
            has_discount = await conn.fetchval(
                """
                SELECT COALESCE(BOOL_OR(discount_amount > 0), false)
                FROM student_fees
                WHERE student_id = $1
                """,
                student_id,
            )

            # 17. Days since enrollment
            enrollment_days = await conn.fetchval(
                """
                SELECT COALESCE(EXTRACT(DAY FROM NOW() - enrolled_at), 0)
                FROM students WHERE id = $1
                """,
                student_id,
            )

            # 18. Batch dropout rate (historical)
            batch_dropout_rate = await conn.fetchval(
                """
                WITH student_batch AS (
                    SELECT batch_id FROM students WHERE id = $1
                ),
                batch_students AS (
                    SELECT id, deleted_at, enrolled_at
                    FROM students
                    WHERE batch_id = (SELECT batch_id FROM student_batch)
                    AND enrolled_at < CURRENT_DATE - INTERVAL '90 days'
                )
                SELECT
                    CASE
                        WHEN COUNT(*) = 0 THEN 0.05
                        ELSE CAST(COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS FLOAT) / COUNT(*)
                    END
                FROM batch_students
                """,
                student_id,
            )

            return {
                "attendance_30d": float(attendance["att_30d"] or 0),
                "attendance_90d": float(attendance["att_90d"] or 0),
                "attendance_trend": attendance_trend,
                "marks_trend": marks_trend,
                "marks_avg_vs_batch": marks_avg_vs_batch,
                "failed_exams_count": int(failed_count or 0),
                "fee_delay_avg_days": fee_delay_avg_days,
                "days_since_last_payment": days_since_last_payment,
                "overdue_installments": int(overdue_count or 0),
                "assignment_submission_rate": assignment_submission_rate,
                "video_watch_rate": video_watch_rate,
                "days_since_last_login": days_since_last_login,
                "retest_count": int(retest_count or 0),
                "late_attendance_count": int(late_count or 0),
                "excused_absences_count": int(excused_count or 0),
                "has_fee_discount": 1.0 if has_discount else 0.0,
                "days_since_enrollment": float(enrollment_days or 0),
                "batch_dropout_rate": float(batch_dropout_rate or 0.05),
            }


async def extract_performance_features(
    tenant_id: str, student_id: str, subject_id: str
) -> dict:
    """Extract features for next-exam performance prediction."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.fetchval(
                "SELECT set_config('app.current_tenant', $1, true)", tenant_id
            )

            recent = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(me.percentage), 0) AS recent_avg,
                    COALESCE(COUNT(*), 0) AS exam_count
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND me.is_absent = false
                AND e.status = 'PUBLISHED'
                AND me.entered_at >= CURRENT_DATE - INTERVAL '180 days'
                """,
                student_id,
            )

            subject = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(me.percentage), 0) AS subject_avg,
                    COALESCE(COUNT(*), 0) AS subject_count
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND me.is_absent = false
                AND e.subject_id = $2 AND e.status = 'PUBLISHED'
                """,
                student_id,
                subject_id,
            )

            attendance = await conn.fetchval(
                """
                SELECT COALESCE(AVG(CASE WHEN ar.status = 'PRESENT' THEN 1.0 ELSE 0.0 END), 0) * 100
                FROM attendance_records ar
                JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.student_id = $1 AND s.type = 'LECTURE'
                AND s.date >= CURRENT_DATE - INTERVAL '90 days'
                """,
                student_id,
            )

            # Subject-specific marks trend (last 5 exams, oldest first)
            subject_recent = await conn.fetch(
                """
                SELECT me.percentage
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND e.subject_id = $2
                AND me.is_absent = false AND e.status = 'PUBLISHED'
                ORDER BY e.exam_date DESC NULLS LAST
                LIMIT 5
                """,
                student_id,
                subject_id,
            )
            trend_values = [
                float(r["percentage"])
                for r in reversed(subject_recent)
                if r["percentage"] is not None
            ]
            marks_trend = _compute_trend(trend_values)

            batch_avg = await conn.fetchval(
                """
                WITH last_exam AS (
                    SELECT e.id FROM exams e
                    JOIN mark_entries me ON me.exam_id = e.id
                    WHERE me.student_id = $1 AND e.subject_id = $2
                    AND e.status = 'PUBLISHED'
                    ORDER BY e.exam_date DESC NULLS LAST
                    LIMIT 1
                )
                SELECT COALESCE(AVG(me.percentage), 0)
                FROM mark_entries me
                WHERE me.exam_id = (SELECT id FROM last_exam)
                AND me.is_absent = false
                """,
                student_id,
                subject_id,
            )

            last_exam = await conn.fetchrow(
                """
                SELECT
                    me.percentage,
                    EXTRACT(DAY FROM NOW() - me.entered_at)::float AS days_since
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND e.status = 'PUBLISHED'
                  AND me.entered_at IS NOT NULL
                ORDER BY me.entered_at DESC
                LIMIT 1
                """,
                student_id,
            )

            return {
                "recent_avg_percentage": float(recent["recent_avg"] or 0),
                "subject_avg_percentage": float(subject["subject_avg"] or 0),
                "attendance_90d": float(attendance or 0),
                "marks_trend": marks_trend,
                "batch_avg_last_exam": float(batch_avg or 0),
                "days_since_last_exam": float(
                    last_exam["days_since"] if last_exam else 180
                ),
                "study_material_access_rate": 0.5,  # Session 12 placeholder
                "assignment_submission_rate": 0.5,  # Session 12 placeholder
                "video_watch_rate": 0.5,  # Session 12 placeholder
                "last_exam_percentage": float(
                    last_exam["percentage"] if last_exam else 0
                ),
                "exam_count": int(recent["exam_count"] or 0),
                "subject_exam_count": int(subject["subject_count"] or 0),
            }
