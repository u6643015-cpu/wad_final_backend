function configuredOrigins() {
  return (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function getCorsHeaders(request) {
  const allowedOrigins = configuredOrigins();
  const requestOrigin = request?.headers?.get("origin")?.replace(/\/$/, "");
  const localOrigin =
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin || "");
  const originIsAllowed =
    requestOrigin && (allowedOrigins.includes(requestOrigin) || localOrigin);

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": originIsAllowed
      ? requestOrigin
      : allowedOrigins[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
