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

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
