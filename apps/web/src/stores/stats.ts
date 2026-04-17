import { create } from "zustand";
import { api } from "@/lib/api";

interface TodaySession {
  id: string;
  type: "LECTURE" | "EXAM" | "RETEST";
  startTime: string | null;
  endTime: string | null;
  isFinalized: boolean;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  batch: { id: string; name: string; studentCount: number };
  subject: { id: string; name: string } | null;
}

interface TodayAttendance {
  totalSessions: number;
  overallPresent: number;
  overallTotal: number;
  percentage: number;
  sessions: TodaySession[];
}

interface StatsState {
  studentCount: number;
  teacherCount: number;
  batchCount: number;
  pendingJoinRequests: number;
  todayAttendance: TodayAttendance | null;
  loaded: boolean;
  fetch: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  studentCount: 0,
  teacherCount: 0,
  batchCount: 0,
  pendingJoinRequests: 0,
  todayAttendance: null,
  loaded: false,
  fetch: async () => {
    try {
      const res = await api.get("/api/v1/stats/overview");
      const d = res.data.data;
      set({
        studentCount: d.studentCount,
        teacherCount: d.teacherCount,
        batchCount: d.batchCount,
        pendingJoinRequests: d.pendingJoinRequests,
        todayAttendance: d.todayAttendance ?? null,
        loaded: true,
      });
    } catch {
      // silently fail — badges show 0
    }
  },
}));
