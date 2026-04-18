import { lazy, Suspense } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { PageSkeleton } from "@/components/primitives";
import { DashboardLayout } from "@/layouts/DashboardLayout";

const LoginPage = lazy(() =>
  import("@/pages/login/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("@/pages/signup/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const EnrollPage = lazy(() =>
  import("@/pages/enroll/EnrollPage").then((m) => ({ default: m.EnrollPage })),
);
const DashboardRouter = lazy(() =>
  import("@/pages/dashboard/DashboardRouter").then((m) => ({ default: m.DashboardRouter })),
);
const StudentPortal = lazy(() =>
  import("@/pages/portal/StudentPortal").then((m) => ({ default: m.StudentPortal })),
);
const ParentPortal = lazy(() =>
  import("@/pages/parent/ParentPortal").then((m) => ({ default: m.ParentPortal })),
);
const StudentsPage = lazy(() =>
  import("@/pages/students/StudentsPage").then((m) => ({ default: m.StudentsPage })),
);
const StudentDetailPage = lazy(() =>
  import("@/pages/students/StudentDetailPage").then((m) => ({ default: m.StudentDetailPage })),
);
const AttendanceScanPage = lazy(() =>
  import("@/pages/attendance/AttendanceScanPage").then((m) => ({ default: m.AttendanceScanPage })),
);
const TeachersPage = lazy(() =>
  import("@/pages/teachers/TeachersPage").then((m) => ({ default: m.TeachersPage })),
);
const BatchesPage = lazy(() =>
  import("@/pages/batches/BatchesPage").then((m) => ({ default: m.BatchesPage })),
);
const AttendancePage = lazy(() =>
  import("@/pages/attendance/AttendancePage").then((m) => ({ default: m.AttendancePage })),
);
const TimetablePage = lazy(() =>
  import("@/pages/timetable/TimetablePage").then((m) => ({ default: m.TimetablePage })),
);
const ExamsPage = lazy(() =>
  import("@/pages/exams/ExamsPage").then((m) => ({ default: m.ExamsPage })),
);
const OmrPage = lazy(() => import("@/pages/omr/OmrPage").then((m) => ({ default: m.OmrPage })));
const GradebookPage = lazy(() =>
  import("@/pages/gradebook/GradebookPage").then((m) => ({ default: m.GradebookPage })),
);
const RetestsPage = lazy(() =>
  import("@/pages/retests/RetestsPage").then((m) => ({ default: m.RetestsPage })),
);
const FeesPage = lazy(() => import("@/pages/fees/FeesPage").then((m) => ({ default: m.FeesPage })));
const PaymentsPage = lazy(() =>
  import("@/pages/payments/PaymentsPage").then((m) => ({ default: m.PaymentsPage })),
);
const MaterialsPage = lazy(() =>
  import("@/pages/materials/MaterialsPage").then((m) => ({ default: m.MaterialsPage })),
);
const VideosPage = lazy(() =>
  import("@/pages/videos/VideosPage").then((m) => ({ default: m.VideosPage })),
);
const AssignmentsPage = lazy(() =>
  import("@/pages/assignments/AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })),
);
const AnnouncementsPage = lazy(() =>
  import("@/pages/announcements/AnnouncementsPage").then((m) => ({ default: m.AnnouncementsPage })),
);
const CommunicationsPage = lazy(() =>
  import("@/pages/communications/CommunicationsPage").then((m) => ({
    default: m.CommunicationsPage,
  })),
);
const AiAssistantPage = lazy(() =>
  import("@/pages/ai-assistant/AiAssistantPage").then((m) => ({ default: m.AiAssistantPage })),
);
const AnalyticsPage = lazy(() =>
  import("@/pages/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })),
);
const EventsPage = lazy(() =>
  import("@/pages/events/EventsPage").then((m) => ({ default: m.EventsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const JoinRequestsPage = lazy(() =>
  import("@/pages/join-requests/JoinRequestsPage").then((m) => ({ default: m.JoinRequestsPage })),
);
const AtRiskPage = lazy(() =>
  import("@/pages/at-risk/AtRiskPage").then((m) => ({ default: m.AtRiskPage })),
);
const DropoutRiskPage = lazy(() =>
  import("@/pages/analytics/DropoutRiskPage").then((m) => ({
    default: m.DropoutRiskPage,
  })),
);

function lazyPage(node: React.ReactNode) {
  return <Suspense fallback={<PageSkeleton />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: lazyPage(<LoginPage />) },
  { path: "/signup", element: lazyPage(<SignupPage />) },
  { path: "/enroll/:code", element: lazyPage(<EnrollPage />) },
  { path: "/attendance/scan/:code", element: lazyPage(<AttendanceScanPage />) },
  {
    path: "/",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: lazyPage(<DashboardRouter />) },

      {
        path: "students",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <StudentsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "students/:id",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <StudentDetailPage />
          </RoleGuard>,
        ),
      },
      {
        path: "teachers",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "STAFF"]}>
            <TeachersPage />
          </RoleGuard>,
        ),
      },
      {
        path: "batches",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <BatchesPage />
          </RoleGuard>,
        ),
      },
      {
        path: "attendance",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <AttendancePage />
          </RoleGuard>,
        ),
      },
      {
        path: "timetable",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <TimetablePage />
          </RoleGuard>,
        ),
      },
      {
        path: "exams",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <ExamsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "omr",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <OmrPage />
          </RoleGuard>,
        ),
      },
      {
        path: "gradebook",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <GradebookPage />
          </RoleGuard>,
        ),
      },
      {
        path: "retests",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <RetestsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "fees",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "STAFF"]}>
            <FeesPage />
          </RoleGuard>,
        ),
      },
      {
        path: "payments",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "STAFF"]}>
            <PaymentsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "materials",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <MaterialsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "videos",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <VideosPage />
          </RoleGuard>,
        ),
      },
      {
        path: "assignments",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <AssignmentsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "announcements",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <AnnouncementsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "communications",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <CommunicationsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "ai-assistant",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <AiAssistantPage />
          </RoleGuard>,
        ),
      },
      {
        path: "analytics",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "STAFF"]}>
            <AnalyticsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "at-risk",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <AtRiskPage />
          </RoleGuard>,
        ),
      },
      {
        path: "analytics/dropout-risk",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER"]}>
            <DropoutRiskPage />
          </RoleGuard>,
        ),
      },
      {
        path: "events",
        element: lazyPage(
          <RoleGuard roles={["ADMIN", "TEACHER", "STAFF"]}>
            <EventsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "settings",
        element: lazyPage(
          <RoleGuard roles={["ADMIN"]}>
            <SettingsPage />
          </RoleGuard>,
        ),
      },
      {
        path: "join-requests",
        element: lazyPage(
          <RoleGuard roles={["ADMIN"]}>
            <JoinRequestsPage />
          </RoleGuard>,
        ),
      },

      {
        path: "portal",
        element: lazyPage(
          <RoleGuard roles={["STUDENT"]}>
            <StudentPortal />
          </RoleGuard>,
        ),
      },
      {
        path: "portal/:section",
        element: lazyPage(
          <RoleGuard roles={["STUDENT"]}>
            <StudentPortal />
          </RoleGuard>,
        ),
      },
      {
        path: "parent",
        element: lazyPage(
          <RoleGuard roles={["PARENT"]}>
            <ParentPortal />
          </RoleGuard>,
        ),
      },
      {
        path: "parent/:section",
        element: lazyPage(
          <RoleGuard roles={["PARENT"]}>
            <ParentPortal />
          </RoleGuard>,
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
