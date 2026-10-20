import { requireUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constant";
import { parseObjectId, serializeCourse } from "@/lib/course";
import { getDatabase } from "@/lib/mongodb";
import {
  errorResponse,
  preflightResponse,
  successResponse,
} from "@/lib/utils";

export function OPTIONS(request) {
  return preflightResponse(request);
}

export async function POST(request, { params }) {
  const auth = requireUser(request, [USER_ROLES.STUDENT]);
  if (auth.error) return errorResponse(auth.error, auth.status, request);

  const { course_id: courseIdValue } = await params;
  const courseId = parseObjectId(courseIdValue);
  const studentId = parseObjectId(auth.user.id);
  if (!courseId) return errorResponse("Invalid course id", 400, request);
  if (!studentId) return errorResponse("Invalid authenticated user", 401, request);

  try {
    const db = await getDatabase();
    const courses = db.collection("courses");

    const result = await courses.updateOne(
      {
        _id: courseId,
        status: "Open",
        studentIds: { $ne: studentId },
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$studentIds", []] } },
            "$maxStudents",
          ],
        },
      },
      {
        $addToSet: { studentIds: studentId },
        $set: { updatedAt: new Date() },
      },
    );

    if (result.modifiedCount === 0) {
      const course = await courses.findOne({ _id: courseId });
      if (!course || course.status === "Cancel") {
        return errorResponse("Course not found", 404, request);
      }
      if ((course.studentIds || []).some((id) => id.equals(studentId))) {
        return errorResponse("You are already enrolled in this course", 409, request);
      }
      if (course.status !== "Open") {
        return errorResponse("Only Open courses accept enrollment", 409, request);
      }
      if ((course.studentIds || []).length >= course.maxStudents) {
        return errorResponse("This course is full", 409, request);
      }
      return errorResponse("Unable to enroll in this course", 409, request);
    }

    const course = await courses.findOne({ _id: courseId });
    return successResponse(
      {
        message: "Enrollment successful",
        course: serializeCourse(course, auth.user.id),
      },
      200,
      request,
    );
  } catch (error) {
    console.error("Enrollment failed:", error);
    return errorResponse("Unable to enroll in course", 500, request);
  }
}
