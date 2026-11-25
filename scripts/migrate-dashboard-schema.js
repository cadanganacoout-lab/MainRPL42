const { isDeepStrictEqual } = require("node:util");
const { closeDb, getDb } = require("../api/_lib/db");
const { requireMongoConfig, readServerEnv } = require("../api/_lib/env");
const { COLLECTION_SCHEMAS } = require("../api/_lib/collection-schemas");

const MIGRATED_COLLECTIONS = ["users", "cards", "class_agendas"];

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

async function updateValidator(db, name, jsonSchema) {
  const [existing] = await db.listCollections({ name }, { nameOnly: false }).toArray();
  if (!existing) {
    await db.createCollection(name, {
      validator: { $jsonSchema: jsonSchema },
      validationLevel: "strict",
      validationAction: "error",
    });
    return "created";
  }
  const currentSchema = existing.options?.validator?.$jsonSchema;
  if (isDeepStrictEqual(currentSchema, jsonSchema)) return "unchanged";
  await db.command({
    collMod: name,
    validator: { $jsonSchema: jsonSchema },
    validationLevel: "strict",
    validationAction: "error",
  });
  return "updated";
}

async function runMigration({
  args = process.argv.slice(2),
  getDatabase = getDb,
  getEnv = readServerEnv,
  getDatabaseName = () => requireMongoConfig().database,
} = {}) {
  const options = parseArgs(args);
  const database = getDatabaseName();
  if (!options.apply) {
    return {
      mode: "dry-run",
      environment: getEnv().MONGODB_ENVIRONMENT || "unset",
      collections: MIGRATED_COLLECTIONS,
    };
  }

  const env = getEnv();
  if (!options.confirmedDatabase || options.confirmedDatabase !== database) {
    throw new Error("Apply requires --confirm-db=<exact database target>.");
  }
  if (!["development", "production"].includes(env.MONGODB_ENVIRONMENT)) {
    throw new Error("Dashboard schema migration requires a recognized database environment.");
  }
  if (env.MONGODB_ENVIRONMENT === "production" && !options.confirmProduction) {
    throw new Error("Production writes require --confirm-production.");
  }

  const db = await getDatabase();
  const results = {};
  for (const name of MIGRATED_COLLECTIONS) {
    results[name] = await updateValidator(db, name, COLLECTION_SCHEMAS[name]);
  }
  return { mode: "apply", results };
}

if (require.main === module) {
  async function main() {
    let failed = false;
    try {
      console.log(JSON.stringify(await runMigration()));
    } catch (error) {
      const message = error.message.startsWith("Missing required server environment variable:")
        ? error.message
        : "Dashboard schema migration failed or was blocked. No credentials were printed.";
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
  MIGRATED_COLLECTIONS,
  parseArgs,
  runMigration,
  updateValidator,
};
