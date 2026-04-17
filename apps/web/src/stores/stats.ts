import { create } from "zustand";
import { api } from "@/lib/api";

interface StatsState {
  studentCount: number;
  teacherCount: number;
  batchCount: number;
  pendingJoinRequests: number;
  loaded: boolean;
  fetch: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  studentCount: 0,
  teacherCount: 0,
  batchCount: 0,
  pendingJoinRequests: 0,
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
        loaded: true,
      });
    } catch {
      // silently fail — badges show 0
    }
  },
}));
