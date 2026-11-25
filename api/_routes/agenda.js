const { z } = require("zod");
const { requireAuth, requireRole } = require("../_lib/auth");
const { ApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { enforceLimit } = require("./auth");
const { legacyIdSchema, teacherIdSchema } = require("../_lib/schemas");

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const PARITIES = ["ganjil", "genap"];
const PUBLIC_CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=60";
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

const scheduleSlotSchema = z.object({
  mulai: timeSchema.optional(),
  selesai: timeSchema.optional(),
  mapel: z.string().trim().max(120).optional(),
  teacherId: teacherIdSchema.nullable().optional(),
  text: z.string().trim().max(300).optional(),
  istirahat: z.boolean().optional(),
  label: z.string().trim().max(120).optional(),
}).strict().refine(slot => {
  if (slot.text) return true;
  if (slot.istirahat) return Boolean(slot.mulai && slot.selesai && slot.label);
  return Boolean(slot.mulai && slot.selesai && slot.mapel);
}, "Isi pesan atau lengkapi jam dan mata pelajaran.");

const dutySlotSchema = z.object({
  studentId: legacyIdSchema.nullable().optional(),
  text: z.string().trim().max(300).optional(),
}).strict().refine(slot => Boolean(slot.studentId || slot.text), {
  message: "Pilih siswa atau isi keterangan.",
});

function daySlotsSchema(slotSchema) {
  return z.object(Object.fromEntries(
    DAYS.map(day => [day, z.array(slotSchema.nullable()).length(15)]),
  )).strict();
}

const agendaBodySchema = z.object({
  classId: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  className: z.string().trim().min(1).max(80),
  academicYear: z.string().trim().min(1).max(20),
  schedule: z.object(Object.fromEntries(
    PARITIES.map(parity => [parity, daySlotsSchema(scheduleSlotSchema)]),
  )).strict(),
  duties: daySlotsSchema(dutySlotSchema),
}).strict();

function isAgendaRoute(route) {
  return route === "agenda" || route === "admin/agenda";
}

async function requireAdministrator(db, request, response) {
  const session = await requireAuth(db, request);
  requireRole(session, ["admin"]);
  await enforceLimit(
    db,
    response,
    ["admin-agenda", session.user._id.toString()],
    30,
    60 * 60,
  );
  return session;
}

async function verifyReferences(db, agenda) {
  const teacherIds = [...new Set(
    PARITIES.flatMap(parity =>
      DAYS.flatMap(day =>
        agenda.schedule[parity][day]
          .filter(slot => slot?.teacherId)
          .map(slot => slot.teacherId),
      ),
    ),
  )];
  const studentIds = [...new Set(
    DAYS.flatMap(day =>
      agenda.duties[day]
        .filter(slot => slot?.studentId)
        .map(slot => slot.studentId),
    ),
  )];

  if (teacherIds.length) {
    const teachers = await db.collection("teachers")
      .find({ id: { $in: teacherIds }, isActive: true }, { projection: { id: 1 } })
      .toArray();
    if (teachers.length !== teacherIds.length) {
      throw new ApiError(400, "INVALID_TEACHER_REFERENCE", "Pilih guru aktif yang tersedia.");
    }
  }
  if (studentIds.length) {
    const students = await db.collection("cards")
      .find({ legacyId: { $in: studentIds }, isPublished: true }, { projection: { legacyId: 1 } })
      .toArray();
    if (students.length !== studentIds.length) {
      throw new ApiError(400, "INVALID_STUDENT_REFERENCE", "Pilih siswa aktif yang tersedia.");
    }
  }
}

function toPublicAgenda(agenda) {
  return {
    classId: agenda.classId,
    className: agenda.className,
    academicYear: agenda.academicYear,
    schedule: agenda.schedule,
    ...(agenda.legacySchedule ? { legacySchedule: agenda.legacySchedule } : {}),
    duties: agenda.duties,
    updatedAt: agenda.updatedAt,
  };
}

async function getAgenda(db, response) {
  const agenda = await db.collection("class_agendas").findOne({ _id: "active" });
  if (!agenda) {
    throw new ApiError(503, "AGENDA_NOT_CONFIGURED", "Jadwal kelas belum tersedia.");
  }
  sendJson(response, 200, { agenda: toPublicAgenda(agenda) }, { cacheControl: PUBLIC_CACHE_CONTROL });
}

async function saveAgenda(db, response, request, session) {
  const input = agendaBodySchema.parse(await parseJsonBody(request));
  await verifyReferences(db, input);
  const now = new Date();
  await db.collection("class_agendas").updateOne(
    { _id: "active" },
    {
      $set: { ...input, updatedAt: now, updatedBy: session.user._id },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  const agenda = await db.collection("class_agendas").findOne({ _id: "active" });
  sendJson(response, 200, { agenda: toPublicAgenda(agenda) });
}

async function handleAgendaRoute({ request, response, route, db }) {
  if (!isAgendaRoute(route)) return false;
  if (route === "agenda") {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }
    await getAgenda(db, response);
    return true;
  }

  if (!["GET", "PUT"].includes(request.method)) {
    response.setHeader("Allow", "GET, PUT");
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  const session = await requireAdministrator(db, request, response);
  if (request.method === "GET") await getAgenda(db, response);
  else await saveAgenda(db, response, request, session);
  return true;
}

module.exports = {
  DAYS,
  PARITIES,
  agendaBodySchema,
  handleAgendaRoute,
  isAgendaRoute,
  toPublicAgenda,
};
