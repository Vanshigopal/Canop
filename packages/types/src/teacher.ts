import { z } from "zod";

export const PermissionsInputSchema = z.object({
  canManageFees: z.boolean().default(false),
  canApproveAdmissions: z.boolean().default(false),
  canManageExams: z.boolean().default(false),
  canManageAttendance: z.boolean().default(false),
  canManageTimetable: z.boolean().default(false),
  canSendBroadcasts: z.boolean().default(false),
  canViewAnalytics: z.boolean().default(false),
  canManageContent: z.boolean().default(false),
});

export const CreateTeacherSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164 format"),
  subjectIds: z.array(z.string().uuid()).default([]),
  permissions: PermissionsInputSchema.default({}),
});
export type CreateTeacher = z.infer<typeof CreateTeacherSchema>;

export const UpdateTeacherSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().regex(/^\+\d{10,15}$/).optional(),
  subjectIds: z.array(z.string().uuid()).optional(),
  permissions: PermissionsInputSchema.partial().optional(),
});
export type UpdateTeacher = z.infer<typeof UpdateTeacherSchema>;
