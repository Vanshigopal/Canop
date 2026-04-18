export interface DashboardSnapshot {
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
    markedAt: string | null;
    method: string | null;
  };
  weekAttendancePct: number | null;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    subjectName: string | null;
    deadline: string;
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
    nearestDueDate: string | null;
  };
  unreadNotificationCount: number;
}

export interface AttendanceCalendar {
  month: string;
  days: Record<
    string,
    Array<{
      type: "LECTURE" | "EXAM" | "RETEST";
      subjectName: string | null;
      status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      method: "MANUAL" | "QR" | "BIOMETRIC";
      startTime: string | null;
      endTime: string | null;
    }>
  >;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number | null;
  };
}

export interface ChildSummary {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  rollNumber: string | null;
  batchName: string | null;
  className: string | null;
  relationship: string;
  isEmergency: boolean;
}

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  rollNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  enrolledAt: string;
  batch: { id: string; name: string; class: { name: string } | null } | null;
}

export interface NotificationItem {
  id: string;
  campaignId: string | null;
  message: string;
  channel: string;
  status: string;
  eventType: string | null;
  readAt: string | null;
  createdAt: string;
  campaign: {
    title: string;
    createdBy: { name: string } | null;
  } | null;
}

export interface StudentFeeRecord {
  id: string;
  totalAmount: number | string;
  paidAmount: number | string;
  pendingAmount: number | string;
  status: string;
  plan: {
    id: string;
    name: string;
    academicYear: string;
    batch: { id: string; name: string } | null;
  };
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: number | string;
    dueDate: string;
    paidAmount: number | string;
    lateFee: number | string;
    status: "UPCOMING" | "DUE" | "OVERDUE" | "PAID" | "PARTIALLY_PAID";
    paidAt: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number | string;
    method: string;
    status: string;
    receiptNumber: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
}
