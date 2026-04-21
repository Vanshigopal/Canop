import PDFDocument from "pdfkit";
import { prisma } from "@/config/db";

interface StudentReportInput {
  studentId: string;
  tenantId: string;
}

export async function generateStudentReportPdf({
  studentId,
  tenantId,
}: StudentReportInput): Promise<Buffer> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      batch: { select: { name: true } },
      class: { select: { name: true } },
      guardians: true,
    },
  });
  if (!student) throw new Error("Student not found");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  const marks = await prisma.markEntry.findMany({
    where: { studentId: student.id, tenantId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          type: true,
          examDate: true,
          totalMarks: true,
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { enteredAt: "desc" },
  });

  const retests = await prisma.retest.findMany({
    where: { studentId: student.id, tenantId },
    include: { exam: { select: { name: true, subject: { select: { name: true } } } } },
    orderBy: { scheduledDate: "desc" },
  });

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id, tenantId },
    include: {
      session: {
        select: { type: true, subject: { select: { name: true } } },
      },
    },
  });
  const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const attendanceTotal = attendanceRecords.length;
  const attendancePct =
    attendanceTotal > 0 ? Math.round((presentCount / attendanceTotal) * 100) : 0;

  const subjectAttendance = new Map<string, { present: number; total: number }>();
  for (const r of attendanceRecords) {
    const name = r.session?.subject?.name ?? "General";
    const row = subjectAttendance.get(name) ?? { present: 0, total: 0 };
    row.total += 1;
    if (r.status === "PRESENT") row.present += 1;
    subjectAttendance.set(name, row);
  }

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: student.id, tenantId },
    include: {
      assignment: {
        select: {
          title: true,
          deadline: true,
          totalMarks: true,
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const snapshot = await prisma.engagementSnapshot.findFirst({
    where: { studentId: student.id, tenantId },
    orderBy: { snapshotDate: "desc" },
  });

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const INDIGO = "#4F46E5";
  const INK = "#2C2C2A";
  const DIM = "#9B9890";
  const SAND = "#E8E3DA";

  // ── Page 1: Cover + Personal Info ─────────────────
  doc.fontSize(22).fillColor(INDIGO).text(tenant?.name ?? "Canop", { align: "left" });
  doc
    .fontSize(10)
    .fillColor(DIM)
    .text("Student Analytical Report", { align: "left" });
  doc.moveDown(2);

  doc
    .fontSize(24)
    .fillColor(INK)
    .text(student.user.name, { align: "left" });
  doc.fontSize(11).fillColor(DIM);
  const header: string[] = [];
  if (student.rollNumber) header.push(`Roll #${student.rollNumber}`);
  if (student.class?.name) header.push(student.class.name);
  if (student.batch?.name) header.push(student.batch.name);
  doc.text(header.join("  •  "));
  doc.moveDown(1.5);

  section(doc, "Contact", INK, INDIGO);
  kv(doc, "Email", student.user.email);
  kv(doc, "Phone", student.user.phone ?? "—");
  kv(doc, "City", student.city ?? "—");
  kv(doc, "State", student.state ?? "—");
  doc.moveDown(0.5);

  section(doc, "Profile", INK, INDIGO);
  kv(
    doc,
    "Date of Birth",
    student.dateOfBirth ? new Date(student.dateOfBirth).toDateString() : "—",
  );
  kv(doc, "Gender", student.gender ?? "—");
  kv(doc, "Blood group", student.bloodGroup ?? "—");
  kv(doc, "Enrolled", new Date(student.enrolledAt).toDateString());
  doc.moveDown(0.5);

  section(doc, "Guardians", INK, INDIGO);
  if (student.guardians.length === 0) {
    doc.fontSize(10).fillColor(DIM).text("No guardians recorded.");
  } else {
    for (const g of student.guardians) {
      doc
        .fontSize(10)
        .fillColor(INK)
        .text(`${g.name}  —  ${g.relation}  —  ${g.phone}`);
    }
  }

  // ── Exam Results ─────────────────
  doc.addPage();
  section(doc, "Examination Record", INK, INDIGO, 16);
  if (marks.length === 0) {
    doc.fontSize(10).fillColor(DIM).text("No exam results recorded.");
  } else {
    tableHeader(doc, ["Exam", "Subject", "Type", "Date", "Marks", "%"], SAND, INK);
    for (const m of marks) {
      const pct = m.percentage ? `${Number(m.percentage)}%` : "—";
      const marksCell = m.isAbsent
        ? "Absent"
        : `${m.marksObtained ?? 0}/${Number(m.exam.totalMarks)}`;
      tableRow(
        doc,
        [
          m.exam.name,
          m.exam.subject?.name ?? "—",
          m.exam.type,
          m.exam.examDate ? new Date(m.exam.examDate).toDateString().slice(4, 10) : "—",
          marksCell,
          pct,
        ],
        INK,
      );
    }
    const validMarks = marks.filter((m) => !m.isAbsent && m.percentage);
    if (validMarks.length > 0) {
      const avg =
        validMarks.reduce((s, m) => s + Number(m.percentage), 0) / validMarks.length;
      doc.moveDown(1);
      doc
        .fontSize(10)
        .fillColor(INK)
        .text(`Average: ${avg.toFixed(1)}%  •  ${marks.length} exams recorded`);
    }
  }

  // ── Retests ─────────────────
  doc.moveDown(1.5);
  section(doc, "Retest Record", INK, INDIGO);
  if (retests.length === 0) {
    doc.fontSize(10).fillColor(DIM).text("No retests recorded.");
  } else {
    tableHeader(
      doc,
      ["Original Exam", "Subject", "Original", "Retest", "Status"],
      SAND,
      INK,
    );
    for (const r of retests) {
      tableRow(
        doc,
        [
          r.exam.name,
          r.exam.subject?.name ?? "—",
          `${Number(r.originalMarks)}`,
          r.retestMarks != null ? `${Number(r.retestMarks)}` : "—",
          r.status,
        ],
        INK,
      );
    }
  }

  // ── Attendance ─────────────────
  doc.addPage();
  section(doc, "Attendance Summary", INK, INDIGO, 16);
  doc
    .fontSize(12)
    .fillColor(INK)
    .text(
      `Overall: ${presentCount} / ${attendanceTotal} sessions   (${attendancePct}%)`,
    );
  doc.moveDown(0.75);

  if (subjectAttendance.size > 0) {
    tableHeader(doc, ["Subject", "Present", "Total", "%"], SAND, INK);
    for (const [subj, stats] of subjectAttendance) {
      const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      tableRow(doc, [subj, String(stats.present), String(stats.total), `${pct}%`], INK);
    }
  }

  // ── Assignments ─────────────────
  doc.moveDown(1.5);
  section(doc, "Assignment Record", INK, INDIGO);
  if (submissions.length === 0) {
    doc.fontSize(10).fillColor(DIM).text("No assignments recorded.");
  } else {
    tableHeader(
      doc,
      ["Assignment", "Subject", "Deadline", "Status", "Score"],
      SAND,
      INK,
    );
    for (const s of submissions) {
      const score =
        s.marksAwarded != null
          ? `${Number(s.marksAwarded)}/${Number(s.assignment.totalMarks)}`
          : "—";
      tableRow(
        doc,
        [
          s.assignment.title,
          s.assignment.subject?.name ?? "—",
          new Date(s.assignment.deadline).toDateString().slice(4, 10),
          s.status,
          score,
        ],
        INK,
      );
    }
  }

  // ── Engagement ─────────────────
  doc.moveDown(1.5);
  section(doc, "Engagement Score", INK, INDIGO);
  if (snapshot) {
    doc
      .fontSize(20)
      .fillColor(INDIGO)
      .text(`${Number(snapshot.score).toFixed(0)} / 100`);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(INK);
    kv(doc, "Attendance factor", `${Number(snapshot.attendanceScore).toFixed(1)}`);
    kv(doc, "Marks factor", `${Number(snapshot.marksScore).toFixed(1)}`);
    kv(doc, "Assignment factor", `${Number(snapshot.assignmentScore).toFixed(1)}`);
    kv(doc, "Video factor", `${Number(snapshot.videoScore).toFixed(1)}`);
    kv(doc, "Login factor", `${Number(snapshot.loginScore).toFixed(1)}`);
  } else {
    doc.fontSize(10).fillColor(DIM).text("Engagement score not yet calculated.");
  }

  // ── Footer on every page ─────────────────
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(pageRange.start + i);
    doc
      .fontSize(8)
      .fillColor(DIM)
      .text(
        `Confidential — ${tenant?.name ?? "Canop"}  •  Generated on ${new Date().toDateString()}  •  Page ${i + 1} of ${pageRange.count}`,
        50,
        doc.page.height - 35,
        { align: "center", width: doc.page.width - 100 },
      );
  }

  doc.end();

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function section(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  _ink: string,
  accent: string,
  size = 13,
) {
  doc.moveDown(0.25);
  doc.fontSize(9).fillColor(accent).text(title.toUpperCase(), { characterSpacing: 1 });
  doc.fontSize(size).fillColor(_ink);
  doc.moveDown(0.25);
}

function kv(doc: InstanceType<typeof PDFDocument>, k: string, v: string) {
  const startY = doc.y;
  doc.fontSize(9).fillColor("#9B9890").text(k, 50, startY, { continued: false });
  doc.fontSize(10).fillColor("#2C2C2A").text(v, 200, startY);
  doc.moveDown(0.25);
}

function tableHeader(
  doc: InstanceType<typeof PDFDocument>,
  cols: string[],
  sand: string,
  ink: string,
) {
  const pageWidth = doc.page.width - 100;
  const colWidth = pageWidth / cols.length;
  const startY = doc.y;
  doc
    .rect(50, startY - 2, pageWidth, 18)
    .fillOpacity(0.5)
    .fill(sand)
    .fillOpacity(1);
  doc.fontSize(9).fillColor(ink);
  cols.forEach((c, idx) => {
    doc.text(c, 52 + idx * colWidth, startY + 3, { width: colWidth - 4 });
  });
  doc.y = startY + 22;
}

function tableRow(doc: InstanceType<typeof PDFDocument>, cols: string[], ink: string) {
  const pageWidth = doc.page.width - 100;
  const colWidth = pageWidth / cols.length;
  const startY = doc.y;

  if (startY > doc.page.height - 80) {
    doc.addPage();
    return tableRow(doc, cols, ink);
  }

  doc.fontSize(8.5).fillColor(ink);
  cols.forEach((c, idx) => {
    doc.text(c, 52 + idx * colWidth, startY, { width: colWidth - 4, ellipsis: true });
  });
  doc.y = startY + 14;
}
