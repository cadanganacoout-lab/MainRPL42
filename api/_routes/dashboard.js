const { ApiError, sendJson } = require("../_lib/http");

const PUBLIC_CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=60";

function isDashboardRoute(route) {
  return route === "dashboard/summary";
}

async function handleDashboardRoute({ request, response, route, db }) {
  if (!isDashboardRoute(route)) return false;
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }

  const [students, teachers, photos, videos] = await Promise.all([
    db.collection("cards").countDocuments({ isPublished: true }),
    db.collection("teachers").countDocuments({ isActive: true }),
    db.collection("gallery_photos").countDocuments({ isPublished: true }),
    db.collection("videos").countDocuments({ isActive: true }),
  ]);
  sendJson(
    response,
    200,
    { students, teachers, photos, videos },
    { cacheControl: PUBLIC_CACHE_CONTROL },
  );
  return true;
}

module.exports = { handleDashboardRoute, isDashboardRoute };
