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
      tagline: "A demonstration institute for exploring Canop",
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
    where: { tenantId_email: { tenantId: demoTenant.id, email: "admin@demo.canop.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "admin@demo.canop.app",
      passwordHash: hashPassword("password123"),
      name: "Demo Admin",
      role: "ADMIN",
      phone: "+919876543210",
    },
  });
  console.log("[seed] User: admin@demo.canop.app / password123");

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: testTenant.id, email: "admin@test.canop.app" } },
    update: {},
    create: {
      tenantId: testTenant.id,
      email: "admin@test.canop.app",
      passwordHash: hashPassword("password123"),
      name: "Test Admin",
      role: "ADMIN",
    },
  });

  const demoTeacher = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "teacher@demo.canop.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "teacher@demo.canop.app",
      passwordHash: hashPassword("password123"),
      name: "Dr. Mehta",
      role: "TEACHER",
      phone: "+919876543211",
    },
  });
  console.log("[seed] User: teacher@demo.canop.app / password123 (TEACHER)");

  const demoParent = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "parent@demo.canop.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "parent@demo.canop.app",
      name: "Rajesh Kumar",
      role: "PARENT",
      phone: "+919876543212",
    },
  });

  const demoStudent = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "student@demo.canop.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "student@demo.canop.app",
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
    where: {
      tenantId_name_academicYear: {
        tenantId: demoTenant.id,
        name: "11-A",
        academicYear: "2025-2026",
      },
    },
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
    where: {
      tenantId_name_academicYear: {
        tenantId: demoTenant.id,
        name: "NEET-2026",
        academicYear: "2025-2026",
      },
    },
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
      email: "parent@demo.canop.app",
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
    where: { tenantId_email: { tenantId: demoTenant.id, email: "student2@demo.canop.app" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "student2@demo.canop.app",
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
      body: "Welcome to {institute_name}! Your account has been created. Login at your institute's Canop portal to get started.",
    },
    {
      name: "Retest Scheduled",
      slug: "retest_scheduled",
      eventType: "retest_scheduled",
      channel: "WHATSAPP",
      body: "Dear {student_name}, your retest for {exam_name} is scheduled on {retest_date} at {retest_time}. Please be on time. — {institute_name}",
    },
    {
      name: "Retest Scheduled (Parent)",
      slug: "retest_scheduled_parent",
      eventType: "retest_scheduled_parent",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, {student_name}'s retest for {exam_name} is scheduled on {retest_date} at {retest_time}. — {institute_name}",
    },
    {
      name: "Retest No-Show Alert",
      slug: "retest_no_show",
      eventType: "retest_no_show",
      channel: "IN_APP",
      body: "{student_name} did not appear for the retest of {exam_name} scheduled at {retest_time} on {retest_date}.",
    },
    {
      name: "Retest Results",
      slug: "retest_results",
      eventType: "retest_results",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, {student_name} scored {marks}/{total_marks} ({percentage}%) in the {exam_name} retest. — {institute_name}",
    },
    {
      name: "Assignment Published",
      slug: "assignment_published",
      eventType: "assignment_published",
      channel: "WHATSAPP",
      body: "New assignment for {student_name}: '{assignment_name}'. Due {deadline}, total {total_marks} marks. — {institute_name}",
    },
    {
      name: "Assignment Graded",
      slug: "assignment_graded",
      eventType: "assignment_graded",
      channel: "WHATSAPP",
      body: "Dear {parent_name}, {student_name}'s assignment '{assignment_name}' has been graded. Score: {marks}/{total_marks}. — {institute_name}",
    },
    {
      name: "Assignment Deadline Reminder",
      slug: "assignment_deadline_reminder",
      eventType: "assignment_deadline_reminder",
      channel: "WHATSAPP",
      body: "Reminder: {student_name}'s assignment '{assignment_name}' is due {deadline}. Please submit on time. — {institute_name}",
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
  const consentUsers = [
    demoAdmin.id,
    demoTeacher.id,
    demoParent.id,
    demoStudent.id,
    demoStudent2.id,
  ];
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
  console.log(
    `[seed] Consent records for ${consentUsers.length} users × ${consentChannels.length} channels`,
  );

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
  console.log(
    `[seed] Sample broadcast "${sampleCampaign.title}" with ${parents.length} deliveries`,
  );

  // ── Exams (Session 9A) ──
  const bioSubj = subjects.find((s) => s.name === "Biology")!;
  const chemSubj = subjects.find((s) => s.name === "Chemistry")!;

  const now = new Date();
  const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 15));
  const oneMonthAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
  oneWeekAgo.setUTCHours(0, 0, 0, 0);

  const examBio1 = await prisma.exam.upsert({
    where: { id: "00000000-0000-0000-0000-000000000301" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000301",
      tenantId: demoTenant.id,
      batchId: batchNeet.id,
      subjectId: bioSubj.id,
      name: "Unit Test 1 — Biology",
      type: "THEORY",
      status: "PUBLISHED",
      totalMarks: 100,
      cutOffType: "PERCENTAGE",
      passingPercent: 40,
      examDate: twoMonthsAgo,
      startTime: "09:00",
      endTime: "11:00",
      duration: 120,
      createdById: demoAdmin.id,
      publishedById: demoAdmin.id,
      publishedAt: new Date(twoMonthsAgo.getTime() + 2 * 86400000),
    },
  });

  const examMock = await prisma.exam.upsert({
    where: { id: "00000000-0000-0000-0000-000000000302" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000302",
      tenantId: demoTenant.id,
      batchId: batchNeet.id,
      subjectId: null,
      name: "Mock NEET Phase 1",
      type: "MCQ",
      status: "PUBLISHED",
      totalMarks: 720,
      cutOffType: "PERCENTAGE",
      passingPercent: 50,
      totalQuestions: 180,
      marksPerCorrect: 4,
      marksPerWrong: -1,
      marksPerUnattempted: 0,
      examDate: oneMonthAgo,
      startTime: "09:00",
      endTime: "12:00",
      duration: 180,
      createdById: demoAdmin.id,
      publishedById: demoAdmin.id,
      publishedAt: new Date(oneMonthAgo.getTime() + 2 * 86400000),
    },
  });

  await prisma.exam.upsert({
    where: { id: "00000000-0000-0000-0000-000000000303" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000303",
      tenantId: demoTenant.id,
      batchId: batchNeet.id,
      subjectId: chemSubj.id,
      name: "Unit Test 2 — Chemistry",
      type: "THEORY",
      status: "MARKS_ENTRY",
      totalMarks: 100,
      cutOffType: "PERCENTAGE",
      passingPercent: 40,
      examDate: oneWeekAgo,
      startTime: "09:00",
      endTime: "11:00",
      duration: 120,
      createdById: demoAdmin.id,
    },
  });

  // Mark entries for Sneha (the NEET-batch student)
  await prisma.markEntry.upsert({
    where: { examId_studentId: { examId: examBio1.id, studentId: snehaStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      examId: examBio1.id,
      studentId: snehaStudent.id,
      marksObtained: 72,
      percentage: 72,
      grade: "B+",
      batchRank: 1,
      isPassed: true,
      isAbsent: false,
      enteredById: demoTeacher.id,
      enteredAt: new Date(twoMonthsAgo.getTime() + 86400000),
    },
  });

  await prisma.markEntry.upsert({
    where: { examId_studentId: { examId: examMock.id, studentId: snehaStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      examId: examMock.id,
      studentId: snehaStudent.id,
      marksObtained: 430,
      percentage: 59.7,
      grade: "C",
      batchRank: 1,
      isPassed: true,
      isAbsent: false,
      mcqCorrect: 115,
      mcqIncorrect: 30,
      mcqUnattempted: 35,
      mcqPositiveMarks: 460,
      mcqNegativeMarks: -30,
      mcqNetMarks: 430,
      trendDirection: "down",
      enteredById: demoTeacher.id,
      enteredAt: new Date(oneMonthAgo.getTime() + 86400000),
    },
  });
  console.log("[seed] 3 exams + 2 mark entries for Sneha");

  // ── Retest (Session 9B) ──
  // Aarav (11-A student) failed a chemistry unit test — create a PUBLISHED exam
  // with a failed mark entry, then a COMPLETED retest to prove side-by-side display.
  const examFailId = "00000000-0000-0000-0000-000000000304";
  const examFail = await prisma.exam.upsert({
    where: { id: examFailId },
    update: {},
    create: {
      id: examFailId,
      tenantId: demoTenant.id,
      batchId: batch11A.id,
      subjectId: chemSubj.id,
      name: "Unit Test 1 — Chemistry (11-A)",
      type: "THEORY",
      status: "PUBLISHED",
      totalMarks: 100,
      cutOffType: "PERCENTAGE",
      passingPercent: 40,
      examDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 5)),
      startTime: "09:00",
      endTime: "11:00",
      duration: 120,
      createdById: demoAdmin.id,
      publishedById: demoAdmin.id,
      publishedAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 7)),
    },
  });

  await prisma.markEntry.upsert({
    where: { examId_studentId: { examId: examFail.id, studentId: aaravStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      examId: examFail.id,
      studentId: aaravStudent.id,
      marksObtained: 32,
      percentage: 32,
      grade: "F",
      batchRank: 1,
      isPassed: false,
      isAbsent: false,
      enteredById: demoTeacher.id,
      enteredAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 6)),
    },
  });

  const retestScheduled = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7),
  );
  await prisma.retest.upsert({
    where: { examId_studentId: { examId: examFail.id, studentId: aaravStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      examId: examFail.id,
      studentId: aaravStudent.id,
      originalMarks: 32,
      originalPercentage: 32,
      cutOff: 40,
      cutOffType: "PERCENTAGE",
      scheduledDate: retestScheduled,
      scheduledTime: "14:30",
      confirmedById: demoAdmin.id,
      confirmedAt: new Date(retestScheduled.getTime() - 2 * 86400000),
      retestMarks: 52,
      retestPercentage: 52,
      retestIsPassed: true,
      attendedAt: new Date(retestScheduled.getTime() + 5 * 60 * 1000),
      status: "COMPLETED",
      enteredById: demoTeacher.id,
      note: "Improved understanding of periodic table",
    },
  });
  console.log("[seed] 1 COMPLETED retest for Aarav (Chemistry 11-A)");

  // ══════════════════════════════════════════════════════════════════
  // INTELLIGENCE TRACKING (Session 10A)
  // ══════════════════════════════════════════════════════════════════
  const recentEntities: Array<{ entityType: string; entityId: string }> = [
    { entityType: "student", entityId: aaravStudent.id },
    { entityType: "batch", entityId: batch11A.id },
    { entityType: "teacher", entityId: demoTeacher.id },
    { entityType: "exam", entityId: examFail.id },
    { entityType: "exam", entityId: examMock.id },
  ];
  for (const e of recentEntities) {
    await prisma.recentItem.upsert({
      where: {
        userId_entityType_entityId: {
          userId: demoAdmin.id,
          entityType: e.entityType,
          entityId: e.entityId,
        },
      },
      update: { lastViewed: new Date() },
      create: {
        tenantId: demoTenant.id,
        userId: demoAdmin.id,
        entityType: e.entityType,
        entityId: e.entityId,
      },
    });
  }
  console.log(`[seed] ${recentEntities.length} RecentItem rows for demo admin`);

  // Engagement snapshot for Aarav (today)
  const snapshotDate = new Date();
  snapshotDate.setUTCHours(0, 0, 0, 0);
  await prisma.engagementSnapshot.upsert({
    where: {
      studentId_snapshotDate: {
        studentId: aaravStudent.id,
        snapshotDate,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      studentId: aaravStudent.id,
      snapshotDate,
      score: 64.5,
      attendanceScore: 75,
      marksScore: 60,
      assignmentScore: 50,
      videoScore: 50,
      loginScore: 80,
      riskFactors: ["failing_exams"],
    },
  });
  console.log("[seed] 1 EngagementSnapshot for Aarav");

  // LLM config (Session 11) — disabled by default
  await prisma.lLMConfig.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      mode: "DISABLED",
    },
  });
  await prisma.lLMConfig.upsert({
    where: { tenantId: testTenant.id },
    update: {},
    create: {
      tenantId: testTenant.id,
      mode: "DISABLED",
    },
  });
  console.log("[seed] LLMConfig (DISABLED) for demo + test tenants");

  // ══════════════════════════════════════════════════════════════════
  // CONTENT MODULES (Session 12) — demo materials, videos, assignments
  // ══════════════════════════════════════════════════════════════════

  // ── Study Materials (3 — one per subject in batch 11-A) ──
  const bioMaterial = await prisma.studyMaterial.upsert({
    where: { id: "00000000-0000-0000-0000-000000000300" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000300",
      tenantId: demoTenant.id,
      title: "Biology — Cell Structure Notes",
      description: "Chapter 3 notes covering cell membrane, cytoplasm, and organelles.",
      materialType: "PDF",
      fileKey: "demo/static/bio-cell-structure.pdf",
      fileName: "bio-cell-structure.pdf",
      fileSize: 245_600,
      mimeType: "application/pdf",
      subjectId: bio.id,
      chapterNumber: 3,
      chapterTitle: "Cell Structure & Function",
      accessType: "BATCH",
      uploadedById: demoTeacher.id,
      viewCount: 12,
      downloadCount: 7,
      publishedAt: new Date(),
      isPublished: true,
    },
  });
  await prisma.materialBatchAccess.upsert({
    where: { materialId_batchId: { materialId: bioMaterial.id, batchId: batch11A.id } },
    update: {},
    create: { tenantId: demoTenant.id, materialId: bioMaterial.id, batchId: batch11A.id },
  });

  const chemMaterial = await prisma.studyMaterial.upsert({
    where: { id: "00000000-0000-0000-0000-000000000301" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000301",
      tenantId: demoTenant.id,
      title: "Chemistry — Periodic Table Reference",
      materialType: "PDF",
      fileKey: "demo/static/chem-periodic-table.pdf",
      fileName: "chem-periodic-table.pdf",
      fileSize: 189_200,
      mimeType: "application/pdf",
      subjectId: chem.id,
      chapterNumber: 3,
      chapterTitle: "Periodic Classification",
      accessType: "BATCH",
      uploadedById: demoTeacher.id,
      viewCount: 8,
      downloadCount: 4,
      publishedAt: new Date(),
      isPublished: true,
    },
  });
  await prisma.materialBatchAccess.upsert({
    where: { materialId_batchId: { materialId: chemMaterial.id, batchId: batch11A.id } },
    update: {},
    create: { tenantId: demoTenant.id, materialId: chemMaterial.id, batchId: batch11A.id },
  });

  await prisma.studyMaterial.upsert({
    where: { id: "00000000-0000-0000-0000-000000000302" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000302",
      tenantId: demoTenant.id,
      title: "Exam Calendar — Academic Year 2025-26",
      description: "Term schedule, holiday list, and exam windows.",
      materialType: "PDF",
      fileKey: "demo/static/exam-calendar.pdf",
      fileName: "exam-calendar.pdf",
      fileSize: 82_100,
      mimeType: "application/pdf",
      accessType: "INSTITUTE",
      uploadedById: demoAdmin.id,
      publishedAt: new Date(),
      isPublished: true,
    },
  });
  console.log(`[seed] 3 study materials (bio, chem, institute-wide)`);

  // ── Video Lectures (2 stubs, status READY) ──
  const bioVideo = await prisma.videoLecture.upsert({
    where: { id: "00000000-0000-0000-0000-000000000400" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000400",
      tenantId: demoTenant.id,
      title: "Biology — Cell Division (Mitosis Overview)",
      description: "Intro to phases of mitosis with diagrams.",
      bunnyVideoId: "stub-seed-bio-mitosis",
      bunnyLibraryId: "stub-library",
      thumbnailUrl:
        "https://via.placeholder.com/1280x720.png?text=Cell+Division+Stub",
      playbackUrl: "https://iframe.mediadelivery.net/embed/stub/stub-seed-bio-mitosis",
      durationSec: 720,
      status: "READY",
      subjectId: bio.id,
      chapterNumber: 4,
      chapterTitle: "Cell Division",
      accessType: "BATCH",
      uploadedById: demoTeacher.id,
      viewCount: 6,
      totalWatchTimeSec: 3600,
      publishedAt: new Date(),
      isPublished: true,
    },
  });
  await prisma.videoBatchAccess.upsert({
    where: { videoId_batchId: { videoId: bioVideo.id, batchId: batch11A.id } },
    update: {},
    create: { tenantId: demoTenant.id, videoId: bioVideo.id, batchId: batch11A.id },
  });

  const chemVideo = await prisma.videoLecture.upsert({
    where: { id: "00000000-0000-0000-0000-000000000401" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000401",
      tenantId: demoTenant.id,
      title: "Chemistry — Ionic vs Covalent Bonding",
      description: "Worked examples contrasting ionic and covalent bonds.",
      bunnyVideoId: "stub-seed-chem-bonding",
      bunnyLibraryId: "stub-library",
      thumbnailUrl:
        "https://via.placeholder.com/1280x720.png?text=Bonding+Stub",
      playbackUrl: "https://iframe.mediadelivery.net/embed/stub/stub-seed-chem-bonding",
      durationSec: 540,
      status: "READY",
      subjectId: chem.id,
      chapterNumber: 4,
      chapterTitle: "Chemical Bonding",
      accessType: "BATCH",
      uploadedById: demoTeacher.id,
      viewCount: 3,
      totalWatchTimeSec: 1200,
      publishedAt: new Date(),
      isPublished: true,
    },
  });
  await prisma.videoBatchAccess.upsert({
    where: { videoId_batchId: { videoId: chemVideo.id, batchId: batch11A.id } },
    update: {},
    create: { tenantId: demoTenant.id, videoId: chemVideo.id, batchId: batch11A.id },
  });
  console.log(`[seed] 2 video lectures (status READY, stub URLs)`);

  // ── Assignments (2 — one published, one with submission) ──
  const futureDeadline = new Date();
  futureDeadline.setDate(futureDeadline.getDate() + 7);
  const pastDeadline = new Date();
  pastDeadline.setDate(pastDeadline.getDate() - 2);

  await prisma.assignment.upsert({
    where: { id: "00000000-0000-0000-0000-000000000500" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000500",
      tenantId: demoTenant.id,
      title: "Biology Homework — Organelles Diagram",
      description: "Draw and label the major organelles in a eukaryotic cell.",
      instructions: "Use the notes from Chapter 3. Submit as PDF or image.",
      batchId: batch11A.id,
      subjectId: bio.id,
      deadline: futureDeadline,
      allowLateSubmission: true,
      totalMarks: 25,
      latePenaltyPercent: 10,
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdById: demoTeacher.id,
    },
  });

  const gradedAssignment = await prisma.assignment.upsert({
    where: { id: "00000000-0000-0000-0000-000000000501" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000501",
      tenantId: demoTenant.id,
      title: "Chemistry Problem Set — Balancing Equations",
      description: "Complete the 10 balancing equations problems attached.",
      batchId: batch11A.id,
      subjectId: chem.id,
      deadline: pastDeadline,
      allowLateSubmission: false,
      totalMarks: 30,
      status: "PUBLISHED",
      publishedAt: new Date(pastDeadline.getTime() - 7 * 86400000),
      createdById: demoTeacher.id,
    },
  });

  // Sample submission: Aarav submitted + was graded on the chem assignment
  const chemSubmission = await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: gradedAssignment.id,
        studentId: aaravStudent.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      assignmentId: gradedAssignment.id,
      studentId: aaravStudent.id,
      openedAt: new Date(pastDeadline.getTime() - 5 * 86400000),
      firstUploadAt: new Date(pastDeadline.getTime() - 1 * 86400000),
      submittedAt: new Date(pastDeadline.getTime() - 1 * 86400000),
      status: "GRADED",
      isLate: false,
      marksAwarded: 24,
      feedback: "Good attempt — watch the coefficients in Q4 and Q7.",
      gradedById: demoTeacher.id,
      gradedAt: new Date(pastDeadline.getTime() + 1 * 86400000),
    },
  });

  await prisma.submissionFile.upsert({
    where: { id: "00000000-0000-0000-0000-000000000502" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000502",
      tenantId: demoTenant.id,
      submissionId: chemSubmission.id,
      fileKey: "demo/static/aarav-chem-problem-set.pdf",
      fileName: "aarav-chem-problem-set.pdf",
      fileSize: 156_400,
      mimeType: "application/pdf",
    },
  });
  console.log(`[seed] 2 assignments (active bio, graded chem with submission)`);

  // Sample video watch session for Aarav on bio video (80% complete)
  await prisma.videoWatchSession.upsert({
    where: { videoId_studentId: { videoId: bioVideo.id, studentId: aaravStudent.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      videoId: bioVideo.id,
      studentId: aaravStudent.id,
      userId: demoStudent.id,
      furthestPositionSec: 600,
      totalWatchedSec: 576,
      completionPercent: 80,
    },
  });
  console.log(`[seed] 1 video watch session for Aarav (80% on bio video)`);

  // Sample material access log for Aarav
  await prisma.materialAccessLog.create({
    data: {
      tenantId: demoTenant.id,
      materialId: bioMaterial.id,
      studentId: aaravStudent.id,
      userId: demoStudent.id,
      action: "DOWNLOADED",
    },
  });

  // ════════════════════════════════════════════════════════
  // SESSION 14 — Analytics snapshots + default dashboard layout
  // ════════════════════════════════════════════════════════
  console.log("[seed] Generating 30 days of analytics snapshots...");

  const snapshotAnchor = new Date();
  snapshotAnchor.setHours(0, 0, 0, 0);

  function rand(min: number, max: number) {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const snapshotDate = new Date(snapshotAnchor);
    snapshotDate.setDate(snapshotDate.getDate() - daysAgo);

    const baseAttendance = 82;
    const baseEngagement = 68;
    const basePassRate = 74;
    const trendFactor = (30 - daysAgo) / 30;

    await prisma.analyticsSnapshot.upsert({
      where: {
        tenantId_snapshotDate: { tenantId: demoTenant.id, snapshotDate },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        snapshotDate,
        totalSessions: Math.floor(3 + Math.random() * 6),
        avgAttendancePercent: rand(baseAttendance - 5, baseAttendance + 7 * trendFactor),
        absentCount: Math.floor(rand(5, 25)),
        lateCount: Math.floor(rand(0, 8)),
        anomalyCount: Math.floor(rand(0, 3)),
        examsPublished: daysAgo % 7 === 0 ? 1 : 0,
        avgExamPercent: rand(62, 78),
        passRate: rand(basePassRate - 4, basePassRate + 6 * trendFactor),
        pendingRetests: Math.floor(rand(2, 8)),
        expectedRevenue: rand(48000, 55000),
        collectedRevenue: rand(32000, 45000),
        collectionRate: rand(65, 78 + 4 * trendFactor),
        overdueAmount: rand(8000, 18000),
        overdueCount: Math.floor(rand(3, 10)),
        avgEngagementScore: rand(baseEngagement - 4, baseEngagement + 6 * trendFactor),
        atRiskCount: Math.floor(rand(4, 12)),
        activeStudents: Math.floor(rand(30, 45)),
        totalStudents: 48,
        loginCount: Math.floor(rand(20, 60)),
        materialsViewed: Math.floor(rand(8, 25)),
        videosWatched: Math.floor(rand(5, 20)),
        avgVideoCompletion: rand(55, 80),
        assignmentsSubmitted: Math.floor(rand(2, 12)),
        assignmentsMissed: Math.floor(rand(0, 4)),
        messagesSent: Math.floor(rand(3, 20)),
        messagesDelivered: Math.floor(rand(3, 20)),
        deliveryRate: rand(92, 99),
      },
    });
  }
  console.log(`[seed] 31 analytics snapshots created (today + last 30 days)`);

  // Default dashboard layout for demo admin
  const defaultLayout = [
    { i: "w-student-count", x: 0, y: 0, w: 3, h: 2 },
    { i: "w-attendance-today", x: 3, y: 0, w: 3, h: 2 },
    { i: "w-revenue-mtd", x: 6, y: 0, w: 3, h: 2 },
    { i: "w-pending-retests", x: 9, y: 0, w: 3, h: 2 },
    { i: "w-attendance-trend", x: 0, y: 2, w: 6, h: 4 },
    { i: "w-collection-trend", x: 6, y: 2, w: 6, h: 4 },
    { i: "w-top-performers", x: 0, y: 6, w: 4, h: 4 },
    { i: "w-at-risk", x: 4, y: 6, w: 4, h: 4 },
    { i: "w-overdue-aging", x: 8, y: 6, w: 4, h: 4 },
    { i: "w-recent-activity", x: 0, y: 10, w: 12, h: 4 },
  ];
  const defaultWidgets = [
    { id: "w-student-count", type: "student_count", config: {} },
    { id: "w-attendance-today", type: "attendance_today", config: {} },
    { id: "w-revenue-mtd", type: "revenue_mtd", config: {} },
    { id: "w-pending-retests", type: "pending_retests", config: {} },
    { id: "w-attendance-trend", type: "attendance_trend", config: { days: 30 } },
    { id: "w-collection-trend", type: "collection_trend", config: { months: 6 } },
    { id: "w-top-performers", type: "top_performers", config: {} },
    { id: "w-at-risk", type: "at_risk_students", config: {} },
    { id: "w-overdue-aging", type: "overdue_aging", config: {} },
    { id: "w-recent-activity", type: "recent_activity", config: {} },
  ];

  await prisma.dashboardLayout.upsert({
    where: { userId: demoAdmin.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoAdmin.id,
      layout: defaultLayout,
      widgets: defaultWidgets,
      isDefault: true,
    },
  });
  console.log(`[seed] Default dashboard layout for admin`);

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
