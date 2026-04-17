import { z } from "zod";

export const GuardianInputSchema = z.object({
  name: z.string().min(1).max(200),
  relation: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]),
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164 format"),
  email: z.string().email().optional().or(z.literal("")),
  occupation: z.string().max(100).optional(),
  isEmergency: z.boolean().default(false),
});
export type GuardianInput = z.infer<typeof GuardianInputSchema>;

export const EnrollmentFormSchema = z
  .object({
    studentName: z.string().min(1).max(200),
    studentPhone: z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164 format"),
    studentEmail: z.string().email().optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pincode: z.string().max(10).optional(),
    previousSchool: z.string().max(200).optional(),
    bloodGroup: z.string().max(5).optional(),
    guardians: z.array(GuardianInputSchema).min(1, "At least one guardian is required"),
  })
  .refine((d) => d.guardians.some((g) => g.isEmergency), {
    message: "At least one guardian must be marked as emergency contact",
    path: ["guardians"],
  });
export type EnrollmentForm = z.infer<typeof EnrollmentFormSchema>;

export const InviteCreateSchema = z.object({
  batchId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  maxUses: z.number().int().min(0).default(0),
  expiresAt: z.string().datetime().optional(),
});
export type InviteCreate = z.infer<typeof InviteCreateSchema>;
