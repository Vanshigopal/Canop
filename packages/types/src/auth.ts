import { z } from "zod";
import { TenantSlugSchema } from "./tenant";

// ── Login (email + password for Admin/Teacher) ───────────

export const LoginRequestSchema = z.object({
  tenantSlug: TenantSlugSchema,
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
  }),
  tenant: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ── OTP (phone auth for Student/Parent) ──────────────────

export const OtpSendRequestSchema = z.object({
  tenantSlug: TenantSlugSchema,
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone must be in E.164 format (e.g. +919876543210)"),
});

export type OtpSendRequest = z.infer<typeof OtpSendRequestSchema>;

export const OtpVerifyRequestSchema = z.object({
  tenantSlug: TenantSlugSchema,
  phone: z.string().regex(/^\+\d{10,15}$/),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export type OtpVerifyRequest = z.infer<typeof OtpVerifyRequestSchema>;

// ── Refresh ──────────────────────────────────────────────

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().uuid(),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

// ── User profile from /me ────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AuthPermissions {
  canManageFees: boolean;
  canApproveAdmissions: boolean;
  canManageExams: boolean;
  canManageAttendance: boolean;
  canManageTimetable: boolean;
  canSendBroadcasts: boolean;
  canViewAnalytics: boolean;
  canManageContent: boolean;
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
}

export interface MeResponse {
  user: AuthUser;
  permissions: AuthPermissions | null;
  tenant: AuthTenant;
}
