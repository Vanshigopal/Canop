import { Navigate, createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoginPage } from "@/pages/login/LoginPage";
import { SignupPage } from "@/pages/signup/SignupPage";
import { DashboardRouter } from "@/pages/dashboard/DashboardRouter";
import { StudentPortal } from "@/pages/portal/StudentPortal";
import { ParentPortal } from "@/pages/parent/ParentPortal";
import { StudentsPage } from "@/pages/students/StudentsPage";
import { TeachersPage } from "@/pages/teachers/TeachersPage";
import { BatchesPage } from "@/pages/batches/BatchesPage";
import { AttendancePage } from "@/pages/attendance/AttendancePage";
import { TimetablePage } from "@/pages/timetable/TimetablePage";
import { ExamsPage } from "@/pages/exams/ExamsPage";
import { OmrPage } from "@/pages/omr/OmrPage";
import { GradebookPage } from "@/pages/gradebook/GradebookPage";
import { FeesPage } from "@/pages/fees/FeesPage";
import { PaymentsPage } from "@/pages/payments/PaymentsPage";
import { MaterialsPage } from "@/pages/materials/MaterialsPage";
import { VideosPage } from "@/pages/videos/VideosPage";
import { AssignmentsPage } from "@/pages/assignments/AssignmentsPage";
import { AnnouncementsPage } from "@/pages/announcements/AnnouncementsPage";
import { CommunicationsPage } from "@/pages/communications/CommunicationsPage";
import { AiAssistantPage } from "@/pages/ai-assistant/AiAssistantPage";
import { AnalyticsPage } from "@/pages/analytics/AnalyticsPage";
import { EventsPage } from "@/pages/events/EventsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { JoinRequestsPage } from "@/pages/join-requests/JoinRequestsPage";
import { EnrollPage } from "@/pages/enroll/EnrollPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/enroll/:code", element: <EnrollPage /> },
  {
    path: "/",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardRouter /> },

      // Admin / Staff modules
      { path: "students", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><StudentsPage /></RoleGuard> },
      { path: "teachers", element: <RoleGuard roles={["ADMIN", "STAFF"]}><TeachersPage /></RoleGuard> },
      { path: "batches", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><BatchesPage /></RoleGuard> },
      { path: "attendance", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><AttendancePage /></RoleGuard> },
      { path: "timetable", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><TimetablePage /></RoleGuard> },
      { path: "exams", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><ExamsPage /></RoleGuard> },
      { path: "omr", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><OmrPage /></RoleGuard> },
      { path: "gradebook", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><GradebookPage /></RoleGuard> },
      { path: "fees", element: <RoleGuard roles={["ADMIN", "STAFF"]}><FeesPage /></RoleGuard> },
      { path: "payments", element: <RoleGuard roles={["ADMIN", "STAFF"]}><PaymentsPage /></RoleGuard> },
      { path: "materials", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><MaterialsPage /></RoleGuard> },
      { path: "videos", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><VideosPage /></RoleGuard> },
      { path: "assignments", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><AssignmentsPage /></RoleGuard> },
      { path: "announcements", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><AnnouncementsPage /></RoleGuard> },
      { path: "communications", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><CommunicationsPage /></RoleGuard> },
      { path: "ai-assistant", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><AiAssistantPage /></RoleGuard> },
      { path: "analytics", element: <RoleGuard roles={["ADMIN", "STAFF"]}><AnalyticsPage /></RoleGuard> },
      { path: "events", element: <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}><EventsPage /></RoleGuard> },
      { path: "settings", element: <RoleGuard roles={["ADMIN"]}><SettingsPage /></RoleGuard> },
      { path: "join-requests", element: <RoleGuard roles={["ADMIN"]}><JoinRequestsPage /></RoleGuard> },

      // Student portal
      { path: "portal", element: <RoleGuard roles={["STUDENT"]}><StudentPortal /></RoleGuard> },
      { path: "portal/:section", element: <RoleGuard roles={["STUDENT"]}><StudentPortal /></RoleGuard> },

      // Parent portal
      { path: "parent", element: <RoleGuard roles={["PARENT"]}><ParentPortal /></RoleGuard> },
      { path: "parent/:section", element: <RoleGuard roles={["PARENT"]}><ParentPortal /></RoleGuard> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
