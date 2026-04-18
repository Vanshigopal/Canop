import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  CheckSquare,
  FileText,
  ScanLine,
  BookOpen,
  Video,
  FolderOpen,
  ClipboardList,
  IndianRupee,
  Clock,
  Megaphone,
  MessageSquare,
  CalendarDays,
  Sparkles,
  BarChart3,
  UserPlus,
  RotateCcw,
  Settings,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: "default" | "danger" | "warning";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavigation: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Students", path: "/students", icon: Users, badge: "247" },
      { name: "Teachers", path: "/teachers", icon: GraduationCap },
      { name: "Batches", path: "/batches", icon: Calendar },
      { name: "Attendance", path: "/attendance", icon: CheckSquare },
    ],
  },
  {
    label: "Academics",
    items: [
      { name: "Exams & Marks", path: "/exams", icon: FileText },
      { name: "OMR Scanner", path: "/omr", icon: ScanLine },
      { name: "Gradebook", path: "/gradebook", icon: BookOpen },
      { name: "Retests", path: "/retests", icon: RotateCcw },
      { name: "Videos", path: "/videos", icon: Video },
      { name: "Materials", path: "/materials", icon: FolderOpen },
      { name: "Assignments", path: "/assignments", icon: ClipboardList },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Fees", path: "/fees", icon: IndianRupee },
      { name: "Timetable", path: "/timetable", icon: Clock },
      { name: "Announcements", path: "/announcements", icon: Megaphone },
      { name: "Messages", path: "/communications", icon: MessageSquare },
      { name: "Events", path: "/events", icon: CalendarDays },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "AI Assistant", path: "/ai-assistant", icon: Sparkles },
      { name: "At-Risk Students", path: "/at-risk", icon: AlertTriangle },
      { name: "Dropout Risk", path: "/analytics/dropout-risk", icon: AlertTriangle },
      { name: "Analytics", path: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Overview", path: "/analytics", icon: BarChart3 },
      { name: "Attendance", path: "/analytics/attendance", icon: CheckSquare },
      { name: "Academic", path: "/analytics/academic", icon: FileText },
      { name: "Financial", path: "/analytics/financial", icon: IndianRupee },
      { name: "Engagement", path: "/analytics/engagement", icon: Sparkles },
      { name: "Compare", path: "/analytics/compare", icon: BarChart3 },
      { name: "Exports", path: "/analytics/exports", icon: FolderOpen },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        name: "Join Requests",
        path: "/join-requests",
        icon: UserPlus,
        badge: "2",
        badgeTone: "danger",
      },
      { name: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export function getTeacherNavigation(permissions?: { canManageFees?: boolean } | null): NavGroup[] {
  return adminNavigation
    .filter((g) => g.label !== "Admin")
    .map((g) => {
      if (g.label === "Operations" && !permissions?.canManageFees) {
        return { ...g, items: g.items.filter((i) => i.path !== "/fees") };
      }
      return g;
    });
}

export const studentNavigation: NavGroup[] = [
  {
    label: "Portal",
    items: [
      { name: "Today", path: "/portal", icon: LayoutDashboard },
      { name: "My Classes", path: "/portal/classes", icon: BookOpen },
      { name: "My Marks", path: "/portal/marks", icon: FileText },
      { name: "Assignments", path: "/portal/assignments", icon: ClipboardList },
      { name: "Videos", path: "/portal/videos", icon: Video },
      { name: "Messages", path: "/portal/messages", icon: MessageSquare },
    ],
  },
];

export const parentNavigation: NavGroup[] = [
  {
    label: "Portal",
    items: [
      { name: "My Children", path: "/parent", icon: Users },
      { name: "Attendance", path: "/parent/attendance", icon: CheckSquare },
      { name: "Marks", path: "/parent/marks", icon: FileText },
      { name: "Fees", path: "/parent/fees", icon: IndianRupee },
      { name: "Messages", path: "/parent/messages", icon: MessageSquare },
    ],
  },
];

export function getNavigationForRole(
  role?: string,
  permissions?: { canManageFees?: boolean } | null,
): NavGroup[] {
  switch (role) {
    case "STUDENT":
      return studentNavigation;
    case "PARENT":
      return parentNavigation;
    case "TEACHER":
      return getTeacherNavigation(permissions);
    default:
      return adminNavigation;
  }
}

export function getAllNavItems(): NavItem[] {
  return adminNavigation.flatMap((g) => g.items);
}
