import { api } from "@/lib/api";
import { BookOpen, User } from "lucide-react";
import { useEffect, useState } from "react";
import { AcademicTab } from "../students/tabs/AcademicTab";
import { ExamResultsTab } from "../exams/ExamResultsTab";
import type { ExamRow } from "../exams/ExamsPage";

type View = "student" | "exam";

interface StudentOption {
  id: string;
  rollNumber: string | null;
  user: { name: string };
  batch: { name: string } | null;
}

export function GradebookPage() {
  const [view, setView] = useState<View>("student");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api
      .get("/api/v1/students")
      .then((r) => setStudents(r.data.data as StudentOption[]))
      .catch(() => setStudents([]));
    api
      .get("/api/v1/exams", { params: { status: "PUBLISHED" } })
      .then((r) => setExams(r.data.data as ExamRow[]))
      .catch(() => setExams([]));
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Gradebook</h1>
          <p className="text-text-muted text-sm mt-1">Student performance across all exams</p>
        </div>
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        <TabBtn
          active={view === "student"}
          onClick={() => setView("student")}
          icon={<User size={14} />}
        >
          By student
        </TabBtn>
        <TabBtn
          active={view === "exam"}
          onClick={() => setView("exam")}
          icon={<BookOpen size={14} />}
        >
          By exam
        </TabBtn>
      </div>

      {view === "student" && (
        <div className="space-y-4">
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2 min-w-[260px]"
          >
            <option value="">— Select student —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.name} {s.rollNumber ? `(${s.rollNumber})` : ""}
                {s.batch ? ` · ${s.batch.name}` : ""}
              </option>
            ))}
          </select>
          {selectedStudent ? (
            <AcademicTab studentId={selectedStudent} />
          ) : (
            <div className="glass-panel p-8 text-center text-sm text-text-dim">
              Select a student to see their full gradebook.
            </div>
          )}
        </div>
      )}

      {view === "exam" && (
        <ExamResultsTab
          exams={exams}
          onPublished={() => setToast("Results published")}
          onRefresh={() => {
            api
              .get("/api/v1/exams", { params: { status: "PUBLISHED" } })
              .then((r) => setExams(r.data.data as ExamRow[]));
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-text-primary text-white text-xs px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap inline-flex items-center gap-1.5 ${
        active
          ? "border-indigo text-text-primary"
          : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      {icon} {children}
    </button>
  );
}
