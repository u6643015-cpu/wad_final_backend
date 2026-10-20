import { requireUser } from "../../../../lib/auth";
import { parseObjectId } from "../../../../lib/course";
import { getDatabase } from "../../../../lib/mongodb";
import {
  errorResponse,
  preflightResponse,
  successResponse,
} from "../../../../lib/utils";

export function OPTIONS(request) {
  return preflightResponse(request);
}

export async function GET(request, { params }) {
  const auth = requireUser(request);
  if (auth.error) return errorResponse(auth.error, auth.status, request);

  const { user_id: requestedUserId } = await params;
  if (requestedUserId !== auth.user.id) {
    return errorResponse("You may only view your own user record", 403, request);
  }

  const userId = parseObjectId(requestedUserId);
  if (!userId) return errorResponse("Invalid user id", 400, request);

  try {
    const db = await getDatabase();
    const user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { password: 0 } },
    );
    if (!user) return errorResponse("User not found", 404, request);

    return successResponse(
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
  } catch (error) {
    console.error("Get user failed:", error);
    return errorResponse("Unable to load user", 500, request);
  }
}
