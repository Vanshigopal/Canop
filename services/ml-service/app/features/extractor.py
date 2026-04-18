from app.db import get_pool


async def extract_dropout_features(tenant_id: str, student_id: str) -> dict:
    """Query the database to extract the 18 dropout features for a student."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.fetchval(
                "SELECT set_config('app.current_tenant', $1, true)", tenant_id
            )

            attendance = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(CASE WHEN ar.status = 'PRESENT' THEN 1.0 ELSE 0.0 END) FILTER
                        (WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'), 0) * 100 AS att_30d,
                    COALESCE(AVG(CASE WHEN ar.status = 'PRESENT' THEN 1.0 ELSE 0.0 END) FILTER
                        (WHERE s.date >= CURRENT_DATE - INTERVAL '90 days'), 0) * 100 AS att_90d,
                    COALESCE(COUNT(*) FILTER (WHERE ar.status = 'LATE'
                        AND s.date >= CURRENT_DATE - INTERVAL '90 days'), 0) AS late_count,
                    COALESCE(COUNT(*) FILTER (WHERE ar.status = 'EXCUSED'
                        AND s.date >= CURRENT_DATE - INTERVAL '90 days'), 0) AS excused_count
                FROM attendance_records ar
                JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.student_id = $1 AND s.type = 'LECTURE'
                """,
                student_id,
            )

            marks = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(percentage) FILTER (WHERE entered_at >= CURRENT_DATE - INTERVAL '90 days'), 0) AS avg_pct,
                    COALESCE(COUNT(*) FILTER (WHERE is_passed = false
                        AND entered_at >= CURRENT_DATE - INTERVAL '90 days'), 0) AS failed_count,
                    COALESCE(COUNT(*) FILTER (WHERE trend_direction = 'up'), 0) AS up_count,
                    COALESCE(COUNT(*) FILTER (WHERE trend_direction = 'down'), 0) AS down_count
                FROM mark_entries
                WHERE student_id = $1 AND is_absent = false
                """,
                student_id,
            )

            fees = await conn.fetchrow(
                """
                SELECT
                    COALESCE(COUNT(*) FILTER (WHERE i.status = 'OVERDUE'), 0) AS overdue,
                    COALESCE(EXTRACT(DAY FROM NOW() - MAX(p.paid_at))::numeric, 365)::float AS days_since_payment,
                    COALESCE(BOOL_OR(sf.discount_amount > 0), false) AS has_discount
                FROM student_fees sf
                LEFT JOIN installments i ON i.student_fee_id = sf.id
                LEFT JOIN payments p ON p.student_fee_id = sf.id AND p.status = 'SUCCESS'
                WHERE sf.student_id = $1
                """,
                student_id,
            )

            login = await conn.fetchrow(
                """
                SELECT
                    COALESCE(EXTRACT(DAY FROM NOW() - MAX(u.last_login_at))::numeric, 365)::float AS days_since_login,
                    COALESCE(EXTRACT(DAY FROM NOW() - MAX(s.enrolled_at))::numeric, 0)::float AS days_since_enrollment
                FROM students s
                JOIN users u ON u.id = s.user_id
                WHERE s.id = $1
                """,
                student_id,
            )

            retests = await conn.fetchrow(
                """
                SELECT COALESCE(COUNT(*), 0) AS count
                FROM retests
                WHERE student_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'
                """,
                student_id,
            )

            marks_trend_val = 0.0
            if marks:
                up = float(marks["up_count"] or 0)
                down = float(marks["down_count"] or 0)
                total = up + down
                if total > 0:
                    marks_trend_val = (up - down) / total

            return {
                "attendance_30d": float(attendance["att_30d"] or 0),
                "attendance_90d": float(attendance["att_90d"] or 0),
                "attendance_trend": 0.0,
                "marks_trend": marks_trend_val,
                "marks_avg_vs_batch": 0.0,
                "failed_exams_count": int(marks["failed_count"] or 0),
                "fee_delay_avg_days": 0.0,
                "days_since_last_payment": float(fees["days_since_payment"] or 365),
                "overdue_installments": int(fees["overdue"] or 0),
                "assignment_submission_rate": 0.5,
                "video_watch_rate": 0.5,
                "days_since_last_login": float(login["days_since_login"] or 365),
                "retest_count": int(retests["count"] or 0),
                "late_attendance_count": int(attendance["late_count"] or 0),
                "excused_absences_count": int(attendance["excused_count"] or 0),
                "has_fee_discount": 1.0 if fees["has_discount"] else 0.0,
                "days_since_enrollment": float(login["days_since_enrollment"] or 0),
                "batch_dropout_rate": 0.05,
            }


async def extract_performance_features(
    tenant_id: str, student_id: str, subject_id: str
) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.fetchval(
                "SELECT set_config('app.current_tenant', $1, true)", tenant_id
            )

            recent = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(percentage), 0) AS recent_avg,
                    COALESCE(COUNT(*), 0) AS exam_count
                FROM mark_entries me
                JOIN exams e ON e.id = me.exam_id
                WHERE me.student_id = $1 AND me.is_absent = false
                AND e.status = 'PUBLISHED'
                """,
                student_id,
            )

            subject = await conn.fetchrow(
                """
                SELECT
                    COALESCE(AVG(percentage), 0) AS subject_avg,
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

            trend = await conn.fetchrow(
                """
                SELECT
                    COALESCE(COUNT(*) FILTER (WHERE trend_direction = 'up'), 0) AS up,
                    COALESCE(COUNT(*) FILTER (WHERE trend_direction = 'down'), 0) AS down
                FROM mark_entries
                WHERE student_id = $1 AND is_absent = false
                """,
                student_id,
            )
            trend_val = 0.0
            if trend:
                up_n = float(trend["up"] or 0)
                down_n = float(trend["down"] or 0)
                total = up_n + down_n
                if total > 0:
                    trend_val = (up_n - down_n) / total

            return {
                "recent_avg_percentage": float(recent["recent_avg"] or 0),
                "subject_avg_percentage": float(subject["subject_avg"] or 0),
                "attendance_90d": float(attendance or 0),
                "marks_trend": trend_val,
                "batch_avg_last_exam": 0.0,
                "days_since_last_exam": float(
                    last_exam["days_since"] if last_exam else 180
                ),
                "study_material_access_rate": 0.5,
                "assignment_submission_rate": 0.5,
                "video_watch_rate": 0.5,
                "last_exam_percentage": float(
                    last_exam["percentage"] if last_exam else 0
                ),
                "exam_count": int(recent["exam_count"] or 0),
                "subject_exam_count": int(subject["subject_count"] or 0),
            }
