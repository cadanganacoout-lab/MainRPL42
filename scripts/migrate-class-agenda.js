const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { closeDb, getDb } = require("../api/_lib/db");
const { COLLECTION_SCHEMAS } = require("../api/_lib/collection-schemas");
const { ensureCollection } = require("./create-indexes");

const root = path.resolve(__dirname, "..");
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const PARITIES = ["ganjil", "genap"];
const MAX_SLOTS = 15;

function loadLegacyData() {
  const dom = new JSDOM("", { runScripts: "outside-only" });
  try {
    const source = fs.readFileSync(path.join(root, "js", "data.js"), "utf8");
    dom.window.eval(source);
    const data = dom.window.XIRPL1_DATA;
    if (!data?.JADWAL || !data?.PIKET) {
      throw new Error("Could not read the active schedule source data.");
    }
    return data;
  } finally {
    dom.window.close();
  }
}

function slotsFrom(values, createSlot) {
  if (!Array.isArray(values) || values.length > MAX_SLOTS) {
    throw new Error("A class agenda day must contain no more than 15 entries.");
  }
  const slots = values.map(createSlot);
  while (slots.length < MAX_SLOTS) slots.push(null);
  return slots;
}

function toScheduleSlot(row) {
  if (typeof row === "string") {
    const text = row.trim();
    return text ? { text } : null;
  }
  if (!row || typeof row !== "object") return null;
  if (row.istirahat) {
    return {
      mulai: row.mulai,
      selesai: row.selesai,
      istirahat: true,
      label: row.label || "Istirahat",
    };
  }
  return {
    mulai: row.mulai,
    selesai: row.selesai,
    mapel: row.mapel,
    ...(row.teacherId ? { teacherId: row.teacherId } : {}),
  };
}

function toDutySlot(name, students) {
  if (typeof name !== "string" || !name.trim()) return null;
  const student = students.find(item => item.nama === name.trim());
  return student ? { studentId: student.id } : { text: name.trim() };
}

function buildClassAgenda(data, now = new Date()) {
  const schedule = Object.fromEntries(PARITIES.map(parity => [
    parity,
    Object.fromEntries(DAYS.map(day => [
      day,
      slotsFrom(data.JADWAL[parity]?.[day] || [], toScheduleSlot),
    ])),
  ]));
  const legacySchedule = data.JADWAL_LAMA
    ? Object.fromEntries(PARITIES.map(parity => [
        parity,
        Object.fromEntries(DAYS.map(day => [
          day,
          slotsFrom(data.JADWAL_LAMA[parity]?.[day] || [], toScheduleSlot),
        ])),
      ]))
    : undefined;
  const duties = Object.fromEntries(DAYS.map(day => [
    day,
    slotsFrom(data.PIKET[day] || [], name => toDutySlot(name, data.SISWA || [])),
  ]));
  const legacyDuties = data.PIKET_LAMA
    ? Object.fromEntries(DAYS.map(day => [
        day,
        slotsFrom(data.PIKET_LAMA[day] || [], name => toDutySlot(name, data.SISWA || [])),
      ]))
    : undefined;
  return {
    _id: "active",
    classId: (data.SITE?.className || "kelas").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    className: data.SITE?.className || "Kelas",
    academicYear: "belum-diatur",
    schedule,
    ...(legacySchedule ? { legacySchedule } : {}),
    duties,
    ...(legacyDuties ? { legacyDuties } : {}),
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
  };
}

function parseArgs(args) {
  const apply = args.includes("--apply");
  if (apply && args.includes("--dry-run")) {
    throw new Error("Choose either --dry-run or --apply.");
  }
  const confirmDbArg = args.find(arg => arg.startsWith("--confirm-db="));
  return {
    apply,
    confirmedDatabase: confirmDbArg?.slice("--confirm-db=".length),
    confirmProduction: args.includes("--confirm-production"),
  };
}

async function runMigration(args = process.argv.slice(2), dependencies = {}) {
  const options = parseArgs(args);
  const agenda = buildClassAgenda((dependencies.loadLegacyData || loadLegacyData)());
  const summary = {
    mode: options.apply ? "apply" : "dry-run",
    days: DAYS.length,
    scheduleSlots: PARITIES.length * DAYS.length * MAX_SLOTS,
    dutySlots: DAYS.length * MAX_SLOTS,
    populatedScheduleSlots: PARITIES.reduce(
      (count, parity) => count + DAYS.reduce(
        (dayCount, day) => dayCount + agenda.schedule[parity][day].filter(Boolean).length,
        0,
      ),
      0,
    ),
    archivedScheduleSlots: PARITIES.reduce(
      (count, parity) => count + DAYS.reduce(
        (dayCount, day) => dayCount + (agenda.legacySchedule?.[parity]?.[day]?.filter(Boolean).length || 0),
        0,
      ),
      0,
    ),
    populatedDutySlots: DAYS.reduce(
      (count, day) => count + agenda.duties[day].filter(Boolean).length,
      0,
    ),
    archivedDutySlots: DAYS.reduce(
      (count, day) => count + (agenda.legacyDuties?.[day]?.filter(Boolean).length || 0),
      0,
    ),
  };
  if (!options.apply) return summary;

  const env = (dependencies.readServerEnv || require("../api/_lib/env").readServerEnv)();
  if (!options.confirmedDatabase || options.confirmedDatabase !== env.MONGODB_DB) {
    throw new Error("Apply requires --confirm-db=<exact MONGODB_DB>.");
  }
  if (!env.MONGODB_ENVIRONMENT) {
    throw new Error("Missing required server environment variable: MONGODB_ENVIRONMENT");
  }
  if (env.MONGODB_ENVIRONMENT === "production" && !options.confirmProduction) {
    throw new Error("Production writes require --confirm-production.");
  }

  const db = dependencies.db || await (dependencies.getDb || getDb)();
  await ensureCollection(db, "class_agendas", COLLECTION_SCHEMAS.class_agendas);
  const result = await db.collection("class_agendas").updateOne(
    { _id: "active" },
    { $setOnInsert: agenda },
    { upsert: true },
  );
  return {
    ...summary,
    mode: "apply",
    created: result.upsertedCount === 1,
  };
}

if (require.main === module) {
  async function main() {
    let failed = false;
    try {
      console.log(JSON.stringify(await runMigration()));
    } catch (error) {
      const safeMessage = error.message.startsWith("Missing required server environment variable:")
        ? error.message
        : "Schedule migration failed or was blocked. No record contents or credentials were printed.";
      console.error(safeMessage);
      failed = true;
    }
    try {
      await closeDb();
    } catch {
      console.error("Could not close the database connection cleanly.");
      failed = true;
    }
    if (failed) process.exitCode = 1;
  }
  main();
}

module.exports = {
  buildClassAgenda,
  loadLegacyData,
  parseArgs,
  runMigration,
  slotsFrom,
  toDutySlot,
  toScheduleSlot,
};
