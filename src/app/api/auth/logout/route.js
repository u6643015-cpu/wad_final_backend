import { preflightResponse, successResponse } from "../../../../lib/utils";

export function OPTIONS(request) {
  return preflightResponse(request);
}

export async function POST(request) {
  const response = successResponse({ message: "Logged out" }, 200, request);
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
