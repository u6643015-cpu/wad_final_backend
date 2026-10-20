import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDatabase } from "../../../../lib/mongodb";
import {
  errorResponse,
  preflightResponse,
  successResponse,
} from "../../../../lib/utils";

export function OPTIONS(request) {
  return preflightResponse(request);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return errorResponse("Username/email and password are required", 400, request);
    }
    if (!process.env.JWT_SECRET) {
      return errorResponse("Server authentication is not configured", 500, request);
    }

    const db = await getDatabase();
    const user = await db.collection("users").findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return errorResponse("Invalid username/email or password", 401, request);
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    const response = successResponse(
      {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      200,
      request,
    );

    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return errorResponse("Unable to log in", 500, request);
  }
}
