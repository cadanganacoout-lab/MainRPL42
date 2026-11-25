const assert = require("node:assert/strict");
const test = require("node:test");
const apiHandler = require("../api/[...path]");
const { DAYS, PARITIES, agendaBodySchema, toPublicAgenda } = require("../api/_routes/agenda");
const { COLLECTION_SCHEMAS } = require("../api/_lib/collection-schemas");
const { buildClassAgenda } = require("../scripts/migrate-class-agenda");
const {
  buildLegacyVideos,
  makeUpsertOperations,
  runMigration,
} = require("../scripts/migrate-videos");

function createRequest(method, url) {
  return { method, url, headers: {} };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body = "") {
      this.body = body;
    },
  };
}

function blankDays() {
  return Object.fromEntries(DAYS.map(day => [day, Array(15).fill(null)]));
}

function blankAgenda() {
  return {
    classId: "xi-rpl-1",
    className: "XI RPL 1",
    academicYear: "2025/2026",
    schedule: Object.fromEntries(PARITIES.map(parity => [parity, blankDays()])),
    duties: blankDays(),
  };
}

test("dashboard summary counts only public active records", async () => {
  const expected = {
    cards: 33,
    teachers: 15,
    gallery_photos: 47,
    videos: 19,
  };
  const db = {
    collection(name) {
      return {
        async countDocuments(filter) {
          assert.deepEqual(filter, name === "cards"
            ? { isPublished: true }
            : name === "teachers" || name === "videos"
              ? { isActive: true }
              : { isPublished: true });
          return expected[name];
        },
      };
    },
  };
  const response = createResponse();
  await apiHandler.createHandler({ getDatabase: async () => db })(
    createRequest("GET", "/api/dashboard/summary"),
    response,
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    students: 33,
    teachers: 15,
    photos: 47,
    videos: 19,
  });
});

test("agenda schema requires exactly 15 nullable slots per day", () => {
  const agenda = blankAgenda();
  agenda.schedule.ganjil.Senin[0] = {
    mulai: "08:00",
    selesai: "08:45",
    mapel: "Pemrograman",
    teacherId: "g01",
  };
  agenda.duties.Senin[0] = { studentId: "s01" };
  assert.equal(agendaBodySchema.parse(agenda).schedule.ganjil.Senin.length, 15);

  const invalidLength = blankAgenda();
  invalidLength.duties.Senin.pop();
  assert.equal(agendaBodySchema.safeParse(invalidLength).success, false);

  const incompleteSlot = blankAgenda();
  incompleteSlot.schedule.genap.Jumat[0] = { mapel: "Pemrograman" };
  assert.equal(agendaBodySchema.safeParse(incompleteSlot).success, false);
});

test("agenda responses exclude internal metadata and migrations retain archived lessons", () => {
  assert.deepEqual(
    COLLECTION_SCHEMAS.class_agendas.properties.legacyDuties,
    COLLECTION_SCHEMAS.class_agendas.properties.duties,
  );
  const agenda = blankAgenda();
  const publicAgenda = toPublicAgenda({
    ...agenda,
    _id: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: "private-admin-id",
  });
  assert.equal("updatedBy" in publicAgenda, false);
  assert.equal("_id" in publicAgenda, false);

  const source = {
    SITE: { className: "XI RPL 1" },
    SISWA: [{ id: "s01", nama: "Student" }],
    JADWAL: Object.fromEntries(PARITIES.map(parity => [parity, blankDays()])),
    JADWAL_LAMA: Object.fromEntries(PARITIES.map(parity => [
      parity,
      Object.fromEntries(DAYS.map(day => [day, []])),
    ])),
    PIKET: blankDays(),
    PIKET_LAMA: Object.fromEntries(DAYS.map(day => [day, []])),
  };
  source.JADWAL_LAMA.ganjil.Senin = [
    { mulai: "07:00", selesai: "07:45", mapel: "Arsip" },
  ];
  source.PIKET_LAMA.Senin = ["Student"];
  const migrated = buildClassAgenda(source);
  assert.equal(migrated.legacySchedule.ganjil.Senin[0].mapel, "Arsip");
  assert.equal(migrated.legacySchedule.ganjil.Senin.length, 15);
  assert.deepEqual(migrated.legacyDuties.Senin[0], { studentId: "s01" });
  assert.equal(migrated.legacyDuties.Senin.length, 15);
});

test("video migration keeps stable IDs and never overwrites existing records", async () => {
  const date = new Date("2026-01-01T00:00:00.000Z");
  const videos = buildLegacyVideos([
    { id: "v01", judul: "Belajar", deskripsi: "", youtubeId: "dQw4w9WgXcQ" },
  ], date);
  assert.equal(videos[0].youtubeId, "dQw4w9WgXcQ");
  assert.deepEqual(makeUpsertOperations(videos)[0].updateOne.update, {
    $setOnInsert: videos[0],
  });
  assert.throws(() => buildLegacyVideos([
    { id: "v01", judul: "Invalid", youtubeId: "bad" },
  ]));

  let databaseOpened = false;
  await assert.rejects(runMigration({
    args: ["--apply", "--confirm-db=class-db"],
    getDatabaseName: () => "class-db",
    getEnv: () => ({ MONGODB_ENVIRONMENT: "production" }),
    loadVideos: () => [],
    getDatabase: async () => {
      databaseOpened = true;
      throw new Error("Should not open DB before production confirmation.");
    },
  }), /Production writes require --confirm-production/);
  assert.equal(databaseOpened, false);
});
