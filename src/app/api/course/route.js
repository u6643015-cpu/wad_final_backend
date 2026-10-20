import { requireUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constant";
import {
  escapeRegex,
  parseObjectId,
  serializeCourse,
  validateCourseInput,
} from "@/lib/course";
import { getDatabase } from "@/lib/mongodb";
import {
  errorResponse,
  preflightResponse,
  successResponse,
} from "@/lib/utils";

export function OPTIONS(request) {
  return preflightResponse(request);
}

export async function GET(request) {
  const auth = requireUser(request, [USER_ROLES.STUDENT, USER_ROLES.TEACHER]);
  if (auth.error) return errorResponse(auth.error, auth.status, request);

  const userId = parseObjectId(auth.user.id);
  if (!userId) return errorResponse("Invalid authenticated user", 401, request);

  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const query = String(searchParams.get("q") || "").trim();
    const enrolledOnly = searchParams.get("enrolled") === "true";
    const filter =
      auth.user.role === USER_ROLES.TEACHER
        ? { teacherId: userId }
        : { status: { $ne: "Cancel" } };

    if (auth.user.role === USER_ROLES.STUDENT && enrolledOnly) {
      filter.studentIds = userId;
    }
    if (query) {
      const searchRegex = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ name: searchRegex }, { teacherName: searchRegex }];
    }

    const courses = await db
      .collection("courses")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return successResponse(
      { courses: courses.map((course) => serializeCourse(course, auth.user.id)) },
      200,
      request,
    );
  } catch (error) {
    console.error("Get courses failed:", error);
    return errorResponse("Unable to load courses", 500, request);
  }
}

export async function POST(request) {
  const auth = requireUser(request, [USER_ROLES.TEACHER]);
  if (auth.error) return errorResponse(auth.error, auth.status, request);

  const teacherId = parseObjectId(auth.user.id);
  if (!teacherId) return errorResponse("Invalid authenticated user", 401, request);

  try {
    const validation = validateCourseInput(await request.json());
    if (validation.error) return errorResponse(validation.error, 400, request);

    const now = new Date();
    const course = {
      ...validation.value,
      teacherId,
      teacherName: auth.user.username,
      studentIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const result = await db.collection("courses").insertOne(course);
    course._id = result.insertedId;

    return successResponse(
      { message: "Course created", course: serializeCourse(course, auth.user.id) },
      201,
      request,
    );
  } catch (error) {
    console.error("Create course failed:", error);
    return errorResponse("Unable to create course", 500, request);
  }
}
