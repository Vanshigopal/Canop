import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { enableRLS } from "../src/rls";

const prisma = new PrismaClient();

function hashPassword(pw: string): string {
  return hashSync(pw, 12);
}

async function main() {
  console.log("[seed] Starting...");

  await enableRLS(prisma);

  // ── Tenants ──
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Demo Institute",
      status: "ACTIVE",
      tier: "PROFESSIONAL",
      tagline: "A demonstration institute for exploring Raquel",
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`[seed] Tenant: ${demoTenant.slug} (${demoTenant.id})`);

  const testTenant = await prisma.tenant.upsert({
    where: { slug: "test" },
    update: {},
    create: {
      slug: "test",
      name: "Test Academy",
      status: "ACTIVE",
      tier: "BASIC",
      tagline: "A secondary tenant for isolation testing",
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`[seed] Tenant: ${testTenant.slug} (${testTenant.id})`);

  // ── Users ──
  const demoAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "admin@demo.raquel.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "admin@demo.raquel.app",
      passwordHash: hashPassword("password123"),
      name: "Demo Admin",
      role: "ADMIN",
      phone: "+919876543210",
    },
  });
  console.log("[seed] User: admin@demo.raquel.app / password123");

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: testTenant.id, email: "admin@test.raquel.app" } },
    update: {},
    create: {
      tenantId: testTenant.id,
      email: "admin@test.raquel.app",
      passwordHash: hashPassword("password123"),
      name: "Test Admin",
      role: "ADMIN",
    },
  });

  const demoTeacher = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "teacher@demo.raquel.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "teacher@demo.raquel.app",
      passwordHash: hashPassword("password123"),
      name: "Dr. Mehta",
      role: "TEACHER",
      phone: "+919876543211",
    },
  });
  console.log("[seed] User: teacher@demo.raquel.app / password123 (TEACHER)");

  const demoParent = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "parent@demo.raquel.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "parent@demo.raquel.app",
      name: "Rajesh Kumar",
      role: "PARENT",
      phone: "+919876543212",
    },
  });

  const demoStudent = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "student@demo.raquel.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "student@demo.raquel.app",
      name: "Aarav Kumar",
      role: "STUDENT",
      phone: "+919876543213",
    },
  });

  // ── Permissions ──
  await prisma.permission.upsert({
    where: { tenantId_userId: { tenantId: demoTenant.id, userId: demoAdmin.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoAdmin.id,
      canManageFees: true,
      canApproveAdmissions: true,
      canManageExams: true,
      canManageAttendance: true,
      canManageTimetable: true,
      canSendBroadcasts: true,
      canViewAnalytics: true,
      canManageContent: true,
    },
  });

  await prisma.permission.upsert({
    where: { tenantId_userId: { tenantId: demoTenant.id, userId: demoTeacher.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoTeacher.id,
      canManageAttendance: true,
      canManageExams: true,
      canManageContent: true,
      canApproveAdmissions: true,
    },
  });

  // ── Subjects ──
  const subjects = await Promise.all(
    [
      { name: "Biology", code: "BIO" },
      { name: "Chemistry", code: "CHE" },
      { name: "Physics", code: "PHY" },
      { name: "Mathematics", code: "MAT" },
    ].map((s) =>
      prisma.subject.upsert({
        where: { tenantId_name: { tenantId: demoTenant.id, name: s.name } },
        update: {},
        create: { tenantId: demoTenant.id, ...s },
      }),
    ),
  );
  console.log(`[seed] Subjects: ${subjects.map((s) => s.code).join(", ")}`);

  // ── Classes ──
  const classes = await Promise.all(
    [
      { name: "Class 11", orderIndex: 1 },
      { name: "Class 12", orderIndex: 2 },
      { name: "NEET Prep", orderIndex: 3 },
    ].map((c) =>
      prisma.classStandard.upsert({
        where: { tenantId_name: { tenantId: demoTenant.id, name: c.name } },
        update: {},
        create: { tenantId: demoTenant.id, ...c },
      }),
    ),
  );
  console.log(`[seed] Classes: ${classes.map((c) => c.name).join(", ")}`);

  // ── Batches ──
  const class11 = classes[0]!;
  const classNeet = classes[2]!;
  const bio = subjects[0]!;
  const chem = subjects[1]!;

  const batch11A = await prisma.batch.upsert({
    where: { tenantId_name_academicYear: { tenantId: demoTenant.id, name: "11-A", academicYear: "2025-2026" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      classId: class11.id,
      name: "11-A",
      capacity: 60,
      academicYear: "2025-2026",
    },
  });

  const batchNeet = await prisma.batch.upsert({
    where: { tenantId_name_academicYear: { tenantId: demoTenant.id, name: "NEET-2026", academicYear: "2025-2026" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      classId: classNeet.id,
      name: "NEET-2026",
      capacity: 40,
      academicYear: "2025-2026",
    },
  });
  console.log(`[seed] Batches: 11-A, NEET-2026`);

  // ── Batch-Subject links ──
  for (const subj of subjects) {
    await prisma.batchSubject.upsert({
      where: { batchId_subjectId: { batchId: batchNeet.id, subjectId: subj.id } },
      update: {},
      create: { tenantId: demoTenant.id, batchId: batchNeet.id, subjectId: subj.id },
    });
  }
  for (const subj of subjects.slice(0, 3)) {
    await prisma.batchSubject.upsert({
      where: { batchId_subjectId: { batchId: batch11A.id, subjectId: subj.id } },
      update: {},
      create: { tenantId: demoTenant.id, batchId: batch11A.id, subjectId: subj.id },
    });
  }

  // ── Teacher-Subject links ──
  for (const subj of [bio, chem]) {
    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: demoTeacher.id, subjectId: subj.id } },
      update: {},
      create: { tenantId: demoTenant.id, teacherId: demoTeacher.id, subjectId: subj.id },
    });
  }
  console.log("[seed] Teacher Dr. Mehta linked to Biology, Chemistry");

  // ── Demo Student record ──
  await prisma.student.upsert({
    where: { userId: demoStudent.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoStudent.id,
      batchId: batch11A.id,
      classId: class11.id,
      rollNumber: "11A-001",
      dateOfBirth: new Date("2009-05-15"),
      gender: "MALE",
      city: "Ahmedabad",
      state: "Gujarat",
    },
  });

  await prisma.guardian.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      tenantId: demoTenant.id,
      studentId: (await prisma.student.findUnique({ where: { userId: demoStudent.id } }))!.id,
      userId: demoParent.id,
      name: "Rajesh Kumar",
      relation: "FATHER",
      phone: "+919876543212",
      email: "parent@demo.raquel.app",
      isEmergency: true,
    },
  });
  console.log("[seed] Student Aarav Kumar enrolled in 11-A with guardian");

  // ── Invite Link ──
  await prisma.inviteLink.upsert({
    where: { code: "DEMO2026" },
    update: {},
    create: {
      tenantId: demoTenant.id,
      code: "DEMO2026",
      batchId: batchNeet.id,
      classId: classNeet.id,
      createdById: demoAdmin.id,
      maxUses: 50,
    },
  });
  console.log("[seed] Invite link: DEMO2026 → NEET-2026 batch");

  // ── Pending Join Requests ──
  await prisma.joinRequest.createMany({
    skipDuplicates: true,
    data: [
      {
        tenantId: demoTenant.id,
        studentName: "Priya Sharma",
        studentPhone: "+919900100001",
        studentEmail: "priya@gmail.com",
        dateOfBirth: new Date("2008-03-15"),
        gender: "FEMALE",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015",
        classId: classNeet.id,
        batchId: batchNeet.id,
        guardians: [
          { name: "Rajesh Sharma", relation: "FATHER", phone: "+919900100002", isEmergency: true },
          { name: "Sunita Sharma", relation: "MOTHER", phone: "+919900100003" },
        ],
      },
      {
        tenantId: demoTenant.id,
        studentName: "Arjun Patel",
        studentPhone: "+919900200001",
        dateOfBirth: new Date("2009-01-22"),
        gender: "MALE",
        city: "Surat",
        state: "Gujarat",
        classId: class11.id,
        batchId: batch11A.id,
        guardians: [
          { name: "Vikram Patel", relation: "FATHER", phone: "+919900200002", isEmergency: true },
        ],
      },
    ],
  });
  console.log("[seed] 2 pending join requests created");

  // ── Extra student for cross-batch attendance demo ──
  const demoStudent2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "student2@demo.raquel.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "student2@demo.raquel.app",
      name: "Sneha Patel",
      role: "STUDENT",
      phone: "+919876543214",
    },
  });
  await prisma.student.upsert({
    where: { userId: demoStudent2.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoStudent2.id,
      batchId: batchNeet.id,
      classId: classNeet.id,
      rollNumber: "NEET-001",
      dateOfBirth: new Date("2008-09-12"),
      gender: "FEMALE",
      city: "Ahmedabad",
      state: "Gujarat",
    },
  });
  console.log("[seed] Student Sneha Patel enrolled in NEET-2026");

  const aaravStudent = (await prisma.student.findUnique({ where: { userId: demoStudent.id } }))!;
  const snehaStudent = (await prisma.student.findUnique({ where: { userId: demoStudent2.id } }))!;

  // ── StudentBatch links (multi-batch support) ──
  for (const { studentId, batchId, isPrimary } of [
    { studentId: aaravStudent.id, batchId: batch11A.id, isPrimary: true },
    { studentId: snehaStudent.id, batchId: batchNeet.id, isPrimary: true },
  ]) {
    await prisma.studentBatch.upsert({
      where: { studentId_batchId: { studentId, batchId } },
      update: {},
      create: { tenantId: demoTenant.id, studentId, batchId, isPrimary },
    });
  }
  console.log("[seed] StudentBatch links created");

  // ── Attendance Sessions (past 3 days for 11-A) ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Session 1: 11-A LECTURE, 3 days ago, 09:00-10:00 (Biology)
  const attSession1 = await prisma.attendanceSession.upsert({
    where: {
      tenantId_batchId_type_date_startTime: {
        tenantId: demoTenant.id,
        batchId: batch11A.id,
        type: "LECTURE",
        date: threeDaysAgo,
        startTime: "09:00",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      batchId: batch11A.id,
      subjectId: bio.id,
      type: "LECTURE",
      date: threeDaysAgo,
      startTime: "09:00",
      endTime: "10:00",
      markedById: demoTeacher.id,
      isFinalized: true,
      totalPresent: 1,
      totalAbsent: 0,
      totalLate: 0,
      note: "Chapter 5 — Cell Biology",
    },
  });
  await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId: attSession1.id, studentId: aaravStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      sessionId: attSession1.id,
      studentId: aaravStudent.id,
      status: "PRESENT",
      method: "MANUAL",
      homeBatchId: batch11A.id,
      attendedBatchId: batch11A.id,
      isGuestInBatch: false,
      markedById: demoTeacher.id,
    },
  });

  // Session 2: 11-A LECTURE, 2 days ago, 09:00-10:00 (Chemistry) — Aarav LATE
  const attSession2 = await prisma.attendanceSession.upsert({
    where: {
      tenantId_batchId_type_date_startTime: {
        tenantId: demoTenant.id,
        batchId: batch11A.id,
        type: "LECTURE",
        date: twoDaysAgo,
        startTime: "09:00",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      batchId: batch11A.id,
      subjectId: chem.id,
      type: "LECTURE",
      date: twoDaysAgo,
      startTime: "09:00",
      endTime: "10:00",
      markedById: demoTeacher.id,
      isFinalized: true,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 1,
      note: "Chapter 3 — Chemical Bonding",
    },
  });
  await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId: attSession2.id, studentId: aaravStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      sessionId: attSession2.id,
      studentId: aaravStudent.id,
      status: "LATE",
      method: "MANUAL",
      homeBatchId: batch11A.id,
      attendedBatchId: batch11A.id,
      isGuestInBatch: false,
      markedById: demoTeacher.id,
      lateMinutes: 12,
      note: "Traffic delay",
    },
  });

  // Session 3: NEET-2026 LECTURE, yesterday, 11:00-12:30 — Aarav attends as GUEST
  const attSession3 = await prisma.attendanceSession.upsert({
    where: {
      tenantId_batchId_type_date_startTime: {
        tenantId: demoTenant.id,
        batchId: batchNeet.id,
        type: "LECTURE",
        date: yesterday,
        startTime: "11:00",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      batchId: batchNeet.id,
      subjectId: bio.id,
      type: "LECTURE",
      date: yesterday,
      startTime: "11:00",
      endTime: "12:30",
      markedById: demoAdmin.id,
      isFinalized: true,
      totalPresent: 2,
      totalAbsent: 0,
      totalLate: 0,
      note: "Revision — Human Physiology",
    },
  });
  await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId: attSession3.id, studentId: snehaStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      sessionId: attSession3.id,
      studentId: snehaStudent.id,
      status: "PRESENT",
      method: "MANUAL",
      homeBatchId: batchNeet.id,
      attendedBatchId: batchNeet.id,
      isGuestInBatch: false,
      markedById: demoAdmin.id,
    },
  });
  await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId: attSession3.id, studentId: aaravStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      sessionId: attSession3.id,
      studentId: aaravStudent.id,
      status: "PRESENT",
      method: "MANUAL",
      homeBatchId: batch11A.id,
      attendedBatchId: batchNeet.id,
      isGuestInBatch: true,
      markedById: demoAdmin.id,
      note: "Guest from 11-A — Revision class",
    },
  });
  console.log("[seed] 3 attendance sessions with records (incl. cross-batch guest entry)");

  // ── Fee Categories ──
  const feeCategories = await Promise.all(
    [
      { name: "Tuition Fee", description: "Core academic instruction fee" },
      { name: "Lab Fee", description: "Laboratory materials and equipment" },
      { name: "Library", description: "Library access and resources" },
      { name: "Study Material", description: "Books, printed notes, assignments" },
    ].map((c) =>
      prisma.feeCategory.upsert({
        where: { tenantId_name: { tenantId: demoTenant.id, name: c.name } },
        update: {},
        create: { tenantId: demoTenant.id, ...c },
      }),
    ),
  );
  console.log(`[seed] Fee categories: ${feeCategories.map((c) => c.name).join(", ")}`);

  // ── Fee Plan for NEET-2026 ──
  // Total ₹75,000 — 4 quarterly installments of ₹18,750 each
  const feePlan = await prisma.feePlan.upsert({
    where: {
      tenantId_batchId_academicYear: {
        tenantId: demoTenant.id,
        batchId: batchNeet.id,
        academicYear: "2025-2026",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      batchId: batchNeet.id,
      name: "NEET-2026 Annual Fee",
      academicYear: "2025-2026",
      totalAmount: 75000,
      installmentCount: 4,
      installmentFrequency: "QUARTERLY",
      dueDay: 1,
      lateFeeAmount: 500,
      gracePeriodDays: 7,
    },
  });
  console.log(`[seed] Fee plan: ${feePlan.name} — ₹${feePlan.totalAmount}`);

  // ── Fee Plan Items ──
  const planItems: Array<{ name: string; amount: number }> = [
    { name: "Tuition Fee", amount: 60000 },
    { name: "Lab Fee", amount: 8000 },
    { name: "Library", amount: 3000 },
    { name: "Study Material", amount: 4000 },
  ];
  for (const pi of planItems) {
    const cat = feeCategories.find((c) => c.name === pi.name)!;
    await prisma.feePlanItem.upsert({
      where: { planId_categoryId: { planId: feePlan.id, categoryId: cat.id } },
      update: {},
      create: { planId: feePlan.id, categoryId: cat.id, amount: pi.amount },
    });
  }

  // ── StudentFee for Sneha (enrolled in NEET-2026) ──
  const totalAmt = 75000;
  const studentFee = await prisma.studentFee.upsert({
    where: {
      tenantId_studentId_planId: {
        tenantId: demoTenant.id,
        studentId: snehaStudent.id,
        planId: feePlan.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      studentId: snehaStudent.id,
      planId: feePlan.id,
      totalAmount: totalAmt,
      discountAmount: 0,
      paidAmount: 18750,
      pendingAmount: 56250,
      status: "PARTIALLY_PAID",
    },
  });

  // ── Installments: 4 quarterly, ₹18,750 each ──
  // Q1 due Apr 1 2026 (paid), Q2 Jul 1, Q3 Oct 1, Q4 Jan 1 2027
  const per = 18750;
  const installmentSchedule = [
    { n: 1, date: new Date(Date.UTC(2026, 3, 1)), status: "PAID" as const, paidAmount: per },
    { n: 2, date: new Date(Date.UTC(2026, 6, 1)), status: "UPCOMING" as const, paidAmount: 0 },
    { n: 3, date: new Date(Date.UTC(2026, 9, 1)), status: "UPCOMING" as const, paidAmount: 0 },
    { n: 4, date: new Date(Date.UTC(2027, 0, 1)), status: "UPCOMING" as const, paidAmount: 0 },
  ];
  const createdInstallments: Array<{ id: string; n: number }> = [];
  for (const ins of installmentSchedule) {
    const row = await prisma.installment.upsert({
      where: {
        studentFeeId_installmentNumber: {
          studentFeeId: studentFee.id,
          installmentNumber: ins.n,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        studentFeeId: studentFee.id,
        installmentNumber: ins.n,
        amount: per,
        dueDate: ins.date,
        paidAmount: ins.paidAmount,
        status: ins.status,
        paidAt: ins.status === "PAID" ? new Date(ins.date.getTime() + 86400000) : null,
      },
    });
    createdInstallments.push({ id: row.id, n: ins.n });
  }

  // ── Payment for Q1 (cash, paid via admin) ──
  const q1Id = createdInstallments.find((i) => i.n === 1)!.id;
  await prisma.payment.upsert({
    where: { id: "00000000-0000-0000-0000-000000000100" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000100",
      tenantId: demoTenant.id,
      studentFeeId: studentFee.id,
      installmentId: q1Id,
      amount: per,
      method: "CASH",
      status: "SUCCESS",
      receiptNumber: "RCT-DEMO-20260402-001",
      transactionRef: "Cash receipt #001",
      collectedById: demoAdmin.id,
      note: "Q1 installment — paid in cash at office",
      paidAt: new Date(Date.UTC(2026, 3, 2, 10, 30, 0)),
    },
  });
  console.log("[seed] Fee plan + 4 installments + 1 cash payment for Sneha");

  // ── Communications: default templates ──
  const defaultTemplates: Array<{
    name: string;
    slug: string;
    eventType: string;
    channel: "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP";
    subject?: string;
    body: string;
  }> = [
    {
      name: "Absent Notification",
      slug: "attendance_absent",
      eventType: "attendance_absent",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, your child {student_name} was marked absent today ({attendance_date}) at {institute_name}. If this is incorrect, please contact the institute.",
    },
    {
      name: "Absent Notification (SMS)",
      slug: "attendance_absent_sms",
      eventType: "attendance_absent",
      channel: "SMS",
      body: "{student_name} was absent on {attendance_date} at {institute_name}. Contact institute if incorrect.",
    },
    {
      name: "Fee Payment Receipt",
      slug: "fee_paid",
      eventType: "fee_paid",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, payment of Rs.{fee_amount} received for {student_name}. Receipt: {receipt_number}. Pending: Rs.{fee_pending}. Thank you! — {institute_name}",
    },
    {
      name: "Fee Reminder",
      slug: "fee_reminder",
      eventType: "fee_reminder",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, installment #{installment_number} of Rs.{fee_amount} for {student_name} is due on {fee_due_date}. Please pay on time to avoid late fees. — {institute_name}",
    },
    {
      name: "Fee Overdue",
      slug: "fee_overdue",
      eventType: "fee_overdue",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, installment #{installment_number} of Rs.{fee_amount} for {student_name} is overdue. Due was {fee_due_date}. Total pending: Rs.{fee_pending}. Please pay at the earliest. — {institute_name}",
    },
    {
      name: "Enrollment Approved",
      slug: "enrollment_approved",
      eventType: "enrollment_approved",
      channel: "WHATSAPP",
      body: "Welcome to {institute_name}! Your enrollment has been approved. You can now login using your phone number. Batch: {student_batch}.",
    },
    {
      name: "Enrollment Approved (Parent)",
      slug: "enrollment_approved_parent",
      eventType: "enrollment_approved_parent",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, {student_name} has been enrolled at {institute_name}. You can login with your phone number to track attendance, marks, and fees.",
    },
    {
      name: "Marks Published",
      slug: "marks_published",
      eventType: "marks_published",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, {exam_name} results are out. {student_name} scored {marks}/{total_marks} ({percentage}%) in {subject_name}. — {institute_name}",
    },
    {
      name: "Teacher Welcome",
      slug: "teacher_welcome",
      eventType: "teacher_welcome",
      channel: "EMAIL",
      subject: "Welcome to {institute_name}",
      body: "Welcome to {institute_name}! Your account has been created. Login at your institute's Raquel portal to get started.",
    },
  ];

  for (const t of defaultTemplates) {
    await prisma.notificationTemplate.upsert({
      where: {
        tenantId_slug_channel: { tenantId: demoTenant.id, slug: t.slug, channel: t.channel },
      },
      update: { body: t.body, subject: t.subject ?? null },
      create: {
        tenantId: demoTenant.id,
        name: t.name,
        slug: t.slug,
        eventType: t.eventType,
        channel: t.channel,
        subject: t.subject ?? null,
        body: t.body,
        isDefault: true,
      },
    });
  }
  console.log(`[seed] ${defaultTemplates.length} default notification templates`);

  // ── Consent records (all seeded users consented) ──
  const consentUsers = [demoAdmin.id, demoTeacher.id, demoParent.id, demoStudent.id, demoStudent2.id];
  const consentChannels: Array<"SMS" | "WHATSAPP" | "EMAIL"> = ["SMS", "WHATSAPP", "EMAIL"];
  for (const uid of consentUsers) {
    for (const ch of consentChannels) {
      const existing = await prisma.consentRecord.findFirst({
        where: { tenantId: demoTenant.id, userId: uid, channel: ch },
      });
      if (!existing) {
        await prisma.consentRecord.create({
          data: { tenantId: demoTenant.id, userId: uid, channel: ch, consented: true },
        });
      }
    }
  }
  console.log(`[seed] Consent records for ${consentUsers.length} users × ${consentChannels.length} channels`);

  // ── Sample broadcast campaign (already sent) ──
  const sampleCampaign = await prisma.broadcastCampaign.upsert({
    where: { id: "00000000-0000-0000-0000-000000000200" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000200",
      tenantId: demoTenant.id,
      title: "Holiday Notice",
      message:
        "Dear {parent_name}, tomorrow is a holiday at {institute_name}. No classes for {student_batch}. Stay safe!",
      channels: ["WHATSAPP", "SMS"],
      audienceType: "ALL_PARENTS",
      recipientCount: 3,
      sentCount: 3,
      deliveredCount: 3,
      status: "SENT",
      sentAt: new Date(),
      createdById: demoAdmin.id,
    },
  });

  // Sample deliveries for the campaign
  const parents = await prisma.guardian.findMany({
    where: { tenantId: demoTenant.id, userId: { not: null } },
    include: { user: { select: { id: true, phone: true } } },
    take: 3,
  });
  for (const g of parents) {
    if (!g.userId) continue;
    const existing = await prisma.messageDelivery.findFirst({
      where: { campaignId: sampleCampaign.id, recipientId: g.userId, channel: "WHATSAPP" },
    });
    if (!existing) {
      await prisma.messageDelivery.create({
        data: {
          tenantId: demoTenant.id,
          campaignId: sampleCampaign.id,
          recipientId: g.userId,
          recipientPhone: g.phone,
          channel: "WHATSAPP",
          message: `Dear ${g.name}, tomorrow is a holiday at Demo Institute. Stay safe!`,
          status: "DELIVERED",
          providerRef: `stub-seed-${Date.now()}`,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });
    }
  }
  console.log(`[seed] Sample broadcast "${sampleCampaign.title}" with ${parents.length} deliveries`);

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
