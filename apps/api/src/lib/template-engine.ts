export const TEMPLATE_VARIABLES = {
  student_name: "Student's full name",
  student_phone: "Student's phone number",
  student_email: "Student's email",
  student_roll: "Student's roll number",
  student_batch: "Student's batch name",
  student_class: "Student's class name",

  parent_name: "Parent/guardian name",
  parent_phone: "Parent's phone number",

  tutor_name: "Teacher/tutor name",

  institute_name: "Institute name",

  exam_name: "Exam name",
  subject_name: "Subject name",
  marks: "Marks obtained",
  total_marks: "Total marks",
  percentage: "Percentage scored",
  rank: "Batch rank",
  cut_off: "Cut-off marks/percentage",

  attendance_pct: "Attendance percentage",
  attendance_date: "Attendance date",
  attendance_status: "Present/Absent/Late",

  fee_amount: "Fee amount",
  fee_due_date: "Fee due date",
  fee_pending: "Total pending fee",
  fee_paid: "Amount paid",
  installment_number: "Installment number",
  receipt_number: "Payment receipt number",

  retest_date: "Retest scheduled date",
  retest_time: "Retest scheduled time",

  date: "Current date",
  time: "Current time",
  day: "Day of week",
  invite_link: "Enrollment invite link",
} as const;

export type TemplateVariableKey = keyof typeof TEMPLATE_VARIABLES;

export const SAMPLE_CONTEXT: Record<TemplateVariableKey, string> = {
  student_name: "Priya Sharma",
  student_phone: "+919900100001",
  student_email: "priya@gmail.com",
  student_roll: "NEET-007",
  student_batch: "NEET-2026",
  student_class: "NEET Prep",

  parent_name: "Rajesh Sharma",
  parent_phone: "+919900100002",

  tutor_name: "Dr. Mehta",

  institute_name: "Demo Institute",

  exam_name: "Unit Test 3",
  subject_name: "Chemistry",
  marks: "85",
  total_marks: "100",
  percentage: "85",
  rank: "7",
  cut_off: "60",

  attendance_pct: "87",
  attendance_date: "17 Apr 2026",
  attendance_status: "Absent",

  fee_amount: "18,750",
  fee_due_date: "01 May 2026",
  fee_pending: "56,250",
  fee_paid: "18,750",
  installment_number: "2",
  receipt_number: "RCT-DEMO-20260417-003",

  retest_date: "25 Apr 2026",
  retest_time: "10:30 AM",

  date: "17 Apr 2026",
  time: "10:30 AM",
  day: "Thursday",
  invite_link: "https://demo.canop.app/enroll/DEMO2026",
};

/**
 * Resolves template variables against a context object.
 * Unknown {keys} remain unchanged so templates remain debuggable.
 */
export function resolveTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] ?? match;
  });
}

export function listVariables(): Array<{ key: TemplateVariableKey; description: string }> {
  return (Object.entries(TEMPLATE_VARIABLES) as Array<[TemplateVariableKey, string]>).map(
    ([key, description]) => ({ key, description }),
  );
}
