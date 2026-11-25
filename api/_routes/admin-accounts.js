const { ObjectId } = require("mongodb");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../_lib/auth");
const { ApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { hashPassword, generateTemporaryPassword } = require("../_lib/password");
const { destroyAllSessions } = require("../_lib/session");
const { objectIdStringSchema, usernameSchema } = require("../_lib/schemas");
const { enforceLimit } = require("./auth");

const usernameUpdateSchema = z.object({ username: usernameSchema }).strict();
const ACCOUNT_PROJECTION = {
  _id: 1,
  username: 1,
  displayName: 1,
  cardId: 1,
};

function isAdminAccountRoute(route) {
  return route === "admin/accounts" ||
    /^admin\/accounts\/[^/]+(?:\/reset-password)?$/.test(route);
}

async function requireAdministrator(db, request, response, action) {
  const session = await requireAuth(db, request);
  requireRole(session, ["admin"]);
  await enforceLimit(
    db,
    response,
    ["admin-account", action, session.user._id.toString()],
    30,
    60 * 60,
  );
  return session;
}

async function listStudentAccounts(db, response) {
  const accounts = await db.collection("users")
    .find(
      { role: "student", isActive: true, cardId: { $ne: null } },
      { projection: ACCOUNT_PROJECTION },
    )
    .sort({ username: 1 })
    .toArray();
  const cardIds = accounts.map(account => account.cardId);
  const cards = cardIds.length
    ? await db.collection("cards")
      .find({ _id: { $in: cardIds } }, { projection: { _id: 1, legacyId: 1, nama: 1 } })
      .toArray()
    : [];
  const cardsById = new Map(cards.map(card => [card._id.toString(), card]));

  sendJson(response, 200, {
    accounts: accounts.map(account => ({
      id: account._id.toString(),
      username: account.username,
      displayName: account.displayName,
      card: cardsById.has(account.cardId.toString())
        ? {
            id: cardsById.get(account.cardId.toString()).legacyId,
            nama: cardsById.get(account.cardId.toString()).nama,
          }
        : null,
    })),
  });
}

function accountId(value) {
  try {
    return new ObjectId(objectIdStringSchema.parse(decodeURIComponent(value)));
  } catch {
    throw new ApiError(400, "INVALID_ACCOUNT_ID", "ID akun tidak valid.");
  }
}

async function updateStudentUsername(db, response, request, id) {
  const { username } = usernameUpdateSchema.parse(await parseJsonBody(request));
  try {
    const result = await db.collection("users").updateOne(
      { _id: id, role: "student", isActive: true, cardId: { $ne: null } },
      { $set: { username, updatedAt: new Date() } },
    );
    if (result.matchedCount !== 1) {
      throw new ApiError(404, "STUDENT_ACCOUNT_NOT_FOUND", "Akun siswa tidak ditemukan.");
    }
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "USERNAME_UNAVAILABLE", "Username tidak tersedia.");
    }
    throw error;
  }
  const account = await db.collection("users").findOne(
    { _id: id },
    { projection: ACCOUNT_PROJECTION },
  );
  sendJson(response, 200, {
    account: {
      id: account._id.toString(),
      username: account.username,
      displayName: account.displayName,
    },
  });
}

async function resetStudentPassword(db, response, id) {
  const users = db.collection("users");
  const user = await users.findOne(
    { _id: id, role: "student", isActive: true, cardId: { $ne: null } },
    { projection: { _id: 1, username: 1 } },
  );
  if (!user) {
    throw new ApiError(404, "STUDENT_ACCOUNT_NOT_FOUND", "Akun siswa tidak ditemukan.");
  }

  const password = generateTemporaryPassword();
  const passwordHash = await hashPassword(password, user.username);
  const now = new Date();
  const result = await users.updateOne(
    { _id: user._id, role: "student", isActive: true },
    { $set: { passwordHash, mustChangePassword: true, updatedAt: now } },
  );
  if (result.matchedCount !== 1) {
    throw new ApiError(409, "ACCOUNT_CHANGED", "Akun berubah. Coba muat ulang.");
  }
  await destroyAllSessions(db, user._id);
  sendJson(response, 200, {
    username: user.username,
    temporaryPassword: password,
    mustChangePassword: true,
  });
}

async function handleAdminAccountRoute({ request, response, route, db }) {
  if (!isAdminAccountRoute(route)) return false;
  const parts = route.split("/");
  const isList = parts.length === 2;
  const isReset = parts.at(-1) === "reset-password";
  const idPart = isList ? null : isReset ? parts[2] : parts[2];
  const id = idPart ? accountId(idPart) : null;

  const allowedMethod = isList ? "GET" : isReset ? "POST" : "PATCH";
  if (request.method !== allowedMethod) {
    response.setHeader("Allow", allowedMethod);
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }
  await requireAdministrator(
    db,
    request,
    response,
    isReset ? "reset" : "manage",
  );

  if (isList) await listStudentAccounts(db, response);
  else if (isReset) await resetStudentPassword(db, response, id);
  else await updateStudentUsername(db, response, request, id);
  return true;
}

module.exports = {
  handleAdminAccountRoute,
  isAdminAccountRoute,
  usernameUpdateSchema,
};
