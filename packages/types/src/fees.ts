import { z } from "zod";

export const InstallmentFrequencyEnum = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ANNUALLY",
  "CUSTOM",
]);
export type InstallmentFrequency = z.infer<typeof InstallmentFrequencyEnum>;

export const FeeStatusEnum = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "WAIVED",
]);
export type FeeStatus = z.infer<typeof FeeStatusEnum>;

export const DiscountTypeEnum = z.enum([
  "PERCENTAGE",
  "FLAT",
  "SCHOLARSHIP",
  "SIBLING",
  "MERIT",
  "CUSTOM",
]);
export type DiscountType = z.infer<typeof DiscountTypeEnum>;

export const InstallmentStatusEnum = z.enum([
  "UPCOMING",
  "DUE",
  "OVERDUE",
  "PAID",
  "PARTIALLY_PAID",
]);
export type InstallmentStatus = z.infer<typeof InstallmentStatusEnum>;

export const PaymentMethodEnum = z.enum([
  "CASH",
  "UPI",
  "CARD",
  "NETBANKING",
  "CHEQUE",
  "RAZORPAY_ONLINE",
  "BANK_TRANSFER",
  "OTHER",
]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentStatusEnum = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

// Fee Category
export const CreateFeeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});
export type CreateFeeCategory = z.infer<typeof CreateFeeCategorySchema>;

export const UpdateFeeCategorySchema = CreateFeeCategorySchema.extend({
  isActive: z.boolean().optional(),
}).partial();
export type UpdateFeeCategory = z.infer<typeof UpdateFeeCategorySchema>;

// Fee Plan Item
export const FeePlanItemSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
});
export type FeePlanItem = z.infer<typeof FeePlanItemSchema>;

// Fee Plan
export const CreateFeePlanSchema = z.object({
  batchId: z.string().uuid(),
  name: z.string().min(1).max(200),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
  totalAmount: z.number().positive(),
  installmentCount: z.number().int().min(1).max(24).default(1),
  installmentFrequency: InstallmentFrequencyEnum.default("MONTHLY"),
  dueDay: z.number().int().min(1).max(28).default(1),
  lateFeeAmount: z.number().nonnegative().nullable().optional(),
  lateFeePercent: z.number().nonnegative().max(100).nullable().optional(),
  gracePeriodDays: z.number().int().min(0).max(90).default(7),
  gstPercent: z.number().nonnegative().max(100).nullable().optional(),
  items: z.array(FeePlanItemSchema).min(1),
});
export type CreateFeePlan = z.infer<typeof CreateFeePlanSchema>;

export const UpdateFeePlanSchema = CreateFeePlanSchema.omit({ items: true }).partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateFeePlan = z.infer<typeof UpdateFeePlanSchema>;

// Fee Plan Assign
export const AssignFeePlanSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
  discountType: DiscountTypeEnum.optional(),
  discountAmount: z.number().nonnegative().optional(),
  discountReason: z.string().max(300).optional(),
});
export type AssignFeePlan = z.infer<typeof AssignFeePlanSchema>;

// Discount
export const ApplyDiscountSchema = z.object({
  discountType: DiscountTypeEnum,
  discountAmount: z.number().nonnegative(),
  discountReason: z.string().max(300).optional(),
});
export type ApplyDiscount = z.infer<typeof ApplyDiscountSchema>;

// Record Payment
export const RecordPaymentSchema = z.object({
  studentFeeId: z.string().uuid(),
  installmentId: z.string().uuid().optional(),
  amount: z.number().positive(),
  method: PaymentMethodEnum,
  transactionRef: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  paidAt: z.string().datetime().optional(),
});
export type RecordPayment = z.infer<typeof RecordPaymentSchema>;

// Razorpay Order
export const RazorpayOrderSchema = z.object({
  studentFeeId: z.string().uuid(),
  installmentId: z.string().uuid().optional(),
  amount: z.number().positive(),
});
export type RazorpayOrder = z.infer<typeof RazorpayOrderSchema>;

// Razorpay Verify
export const RazorpayVerifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type RazorpayVerify = z.infer<typeof RazorpayVerifySchema>;

// Waive Fee
export const WaiveFeeSchema = z.object({
  reason: z.string().min(1).max(300),
});
export type WaiveFee = z.infer<typeof WaiveFeeSchema>;
