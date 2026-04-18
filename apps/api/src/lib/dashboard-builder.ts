import { addDays, endOfWeek, format, startOfToday, startOfWeek } from "date-fns";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export interface StudentDashboardSnapshot {
  student: {
    id: string;
    name: string;
    rollNumber: string | null;
    batchName: string | null;
    className: string | null;
  };
  todayAttendance: null | {
    sessionId: string;
    subjectName: string | null;
    status: string;
    markedAt: Date | null;
    method: string | null;
  };
  weekAttendancePct: number | null;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    subjectName: string | null;
    deadline: Date;
    totalMarks: number;
    status: string;
  }>;
  recentResults: Array<{
    examId: string;
    examName: string;
    subjectName: string | null;
    marksObtained: number;
    totalMarks: number;
    percentage: number;
    grade: string | null;
    batchRank: number | null;
    trendDirection: string | null;
  }>;
  pendingFees: {
    installmentCount: number;
    totalAmount: number;
    nearestDueDate: Date | null;
  };
  unreadNotificationCount: number;
}

/**
 * Build the dashboard snapshot for a student. Reused by both the student's
 * own route and the parent's child-scoped route.
 */
export async function buildStudentDashboard(
  tx: Tx,
  tenantId: string,
  studentId: string,
  notificationRecipientId: string,
): Promise<StudentDashboardSnapshot | null> {
  const student = await tx.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      batch: {
        select: { id: true, name: true, class: { select: { name: true } } },
      },
    },
  });
  if (!student) return null;

  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const todaySession = student.batchId
    ? await tx.attendanceSession.findFirst({
        where: {
          tenantId,
          batchId: student.batchId,
          date: { gte: today, lt: tomorrow },
          type: "LECTURE",
        },
        include: {
          records: {
            where: { studentId: student.id },
            select: { status: true, markedAt: true, method: true },
          },
          subject: { select: { name: true } },
        },
        orderBy: { startTime: "desc" },
      })
    : null;

  const weekRecords = await tx.attendanceRecord.findMany({
    where: {
      tenantId,
      studentId: student.id,
      session: {
        date: { gte: weekStart, lte: weekEnd },
        type: "LECTURE",
      },
    },
    select: { status: true },
  });
  const totalSessions = weekRecords.length;
  const presentCount = weekRecords.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE",
  ).length;
  const weekAttendancePct =
    totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;

  const upcomingAssignments = student.batchId
    ? await tx.assignment.findMany({
        where: {
          tenantId,
          batchId: student.batchId,
          status: "PUBLISHED",
          deadline: { gte: today, lte: addDays(today, 7) },
          deletedAt: null,
        },
        include: {
          subject: { select: { name: true } },
          submissions: {
            where: { studentId: student.id },
            select: { status: true },
          },
        },
        orderBy: { deadline: "asc" },
        take: 5,
      })
    : [];

  const recentResults = await tx.markEntry.findMany({
    where: {
      tenantId,
      studentId: student.id,
      exam: { status: "PUBLISHED", deletedAt: null },
    },
    include: {
      exam: {
        include: { subject: { select: { name: true } } },
      },
    },
    orderBy: [{ exam: { examDate: "desc" } }, { createdAt: "desc" }],
    take: 3,
  });

  const [pendingFees, nearestInstallment] = await Promise.all([
    tx.installment.aggregate({
      where: {
        tenantId,
        studentFee: { studentId: student.id },
        status: { in: ["UPCOMING", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
      },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    }),
    tx.installment.findFirst({
      where: {
        tenantId,
        studentFee: { studentId: student.id },
        status: { in: ["UPCOMING", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
      },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true },
    }),
  ]);

  const totalPending =
    Number(pendingFees._sum.amount || 0) - Number(pendingFees._sum.paidAmount || 0);

  const unreadNotificationCount = await tx.messageDelivery.count({
    where: { tenantId, recipientId: notificationRecipientId, readAt: null },
  });

  return {
    student: {
      id: student.id,
      name: student.user.name,
      rollNumber: student.rollNumber ?? null,
      batchName: student.batch?.name ?? null,
      className: student.batch?.class?.name ?? null,
    },
    todayAttendance: todaySession
      ? {
          sessionId: todaySession.id,
          subjectName: todaySession.subject?.name ?? null,
          status: todaySession.records[0]?.status || "PENDING",
          markedAt: todaySession.records[0]?.markedAt ?? null,
          method: todaySession.records[0]?.method ?? null,
        }
      : null,
    weekAttendancePct,
    upcomingAssignments: upcomingAssignments.map((a) => ({
      id: a.id,
      title: a.title,
      subjectName: a.subject?.name ?? null,
      deadline: a.deadline,
      totalMarks: Number(a.totalMarks),
      status: a.submissions[0]?.status || "NOT_OPENED",
    })),
    recentResults: recentResults.map((r) => ({
      examId: r.examId,
      examName: r.exam.name,
      subjectName: r.exam.subject?.name ?? null,
      marksObtained: Number(r.marksObtained || 0),
      totalMarks: Number(r.exam.totalMarks),
      percentage: Number(r.percentage || 0),
      grade: r.grade,
      batchRank: r.batchRank,
      trendDirection: r.trendDirection,
    })),
    pendingFees: {
      installmentCount: pendingFees._count,
      totalAmount: Math.max(0, totalPending),
      nearestDueDate: nearestInstallment?.dueDate ?? null,
    },
    unreadNotificationCount,
  };
}

/**
 * Build an attendance calendar (grouped by date) for one student/month.
 */
export async function buildAttendanceCalendar(
  tx: Tx,
  tenantId: string,
  studentId: string,
  month: string,
) {
  const parts = month.split("-").map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const mon = parts[1] ?? new Date().getMonth() + 1;
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59);

  const records = await tx.attendanceRecord.findMany({
    where: {
      tenantId,
      studentId,
      session: { date: { gte: monthStart, lte: monthEnd } },
    },
    include: {
      session: {
        select: {
          date: true,
          type: true,
          startTime: true,
          endTime: true,
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { session: { date: "asc" } },
  });

  const byDate: Record<string, Array<{
    type: string;
    subjectName: string | null;
    status: string;
    method: string;
    startTime: string | null;
    endTime: string | null;
  }>> = {};
  for (const r of records) {
    const key = format(r.session.date, "yyyy-MM-dd");
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push({
      type: r.session.type,
      subjectName: r.session.subject?.name ?? null,
      status: r.status,
      method: r.method,
      startTime: r.session.startTime,
      endTime: r.session.endTime,
    });
  }

  // Summary stats
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : null;

  return {
    month,
    days: byDate,
    summary: { total, present, absent, late, percentage },
  };
}
