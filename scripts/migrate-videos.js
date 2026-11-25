const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { closeDb, getDb } = require("../api/_lib/db");
const { requireMongoConfig, readServerEnv } = require("../api/_lib/env");
const { createVideoSchema } = require("../api/_routes/videos");

const root = path.resolve(__dirname, "..");

function loadLegacyVideos() {
  const dom = new JSDOM("", { runScripts: "outside-only" });
  try {
    const source = fs.readFileSync(path.join(root, "js", "data.js"), "utf8");
    dom.window.eval(source);
    const videos = dom.window.XIRPL1_DATA?.VIDEO;
    if (!Array.isArray(videos)) {
      throw new Error("Could not read the video source data.");
    }
    return videos;
  } finally {
    dom.window.close();
  }
}

function buildLegacyVideos(videos, now = new Date()) {
  const ids = new Set();
  return videos.map((video, index) => {
    const id = video.id || `v${String(index + 1).padStart(2, "0")}`;
    if (!/^v\d{2}$/.test(id) || ids.has(id)) {
      throw new Error("Video source contains invalid or duplicate IDs.");
    }
    ids.add(id);
    const normalized = createVideoSchema.parse({
      judul: video.judul,
      deskripsi: video.deskripsi || "",
      youtubeUrl: video.youtubeId,
    });
    return {
      id,
      ...normalized,
      sortOrder: index + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function parseArgs(args) {
  if (args.includes("--apply") && args.includes("--dry-run")) {
    throw new Error("Choose either --dry-run or --apply.");
  }
  const databaseArg = args.find(argument => argument.startsWith("--confirm-db="));
  return {
    apply: args.includes("--apply"),
    confirmedDatabase: databaseArg?.slice("--confirm-db=".length),
    confirmProduction: args.includes("--confirm-production"),
  };
}

function makeUpsertOperations(videos) {
  return videos.map(video => ({
    updateOne: {
      filter: { id: video.id },
      update: { $setOnInsert: video },
      upsert: true,
    },
  }));
}

async function runMigration({
  args = process.argv.slice(2),
  getDatabase = getDb,
  getEnv = readServerEnv,
  getDatabaseName = () => requireMongoConfig().database,
  loadVideos = loadLegacyVideos,
} = {}) {
  const options = parseArgs(args);
  const videos = buildLegacyVideos(loadVideos());
  if (!options.apply) {
    return { mode: "dry-run", videos: videos.length };
  }

  const env = getEnv();
  const database = getDatabaseName();
  if (!options.confirmedDatabase || options.confirmedDatabase !== database) {
    throw new Error("Apply requires --confirm-db=<exact database target>.");
  }
  if (!["development", "production"].includes(env.MONGODB_ENVIRONMENT)) {
    throw new Error("Video migration requires a recognized database environment.");
  }
  if (env.MONGODB_ENVIRONMENT === "production" && !options.confirmProduction) {
    throw new Error("Production writes require --confirm-production.");
  }

  const db = await getDatabase();
  await db.collection("videos").createIndex(
    { id: 1 },
    { unique: true, name: "video_id_unique" },
  );
  const result = await db.collection("videos").bulkWrite(
    makeUpsertOperations(videos),
    { ordered: true },
  );
  return {
    mode: "apply",
    videos: videos.length,
    inserted: result.upsertedCount,
    alreadyExisted: result.matchedCount,
  };
}

if (require.main === module) {
  async function main() {
    let failed = false;
    try {
      console.log(JSON.stringify(await runMigration()));
    } catch (error) {
      const message = error.message.startsWith("Missing required server environment variable:")
        ? error.message
        : "Video migration failed or was blocked. No record contents or credentials were printed.";
      console.error(message);
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
  buildLegacyVideos,
  loadLegacyVideos,
  makeUpsertOperations,
  parseArgs,
  runMigration,
};
