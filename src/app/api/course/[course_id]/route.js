import { requireUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constant";
import {
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

async function getCourseAndUser(request, params) {
  const auth = requireUser(request, [USER_ROLES.STUDENT, USER_ROLES.TEACHER]);
  if (auth.error) return { response: errorResponse(auth.error, auth.status, request) };

  const { course_id: courseIdValue } = await params;
  const courseId = parseObjectId(courseIdValue);
  const userId = parseObjectId(auth.user.id);
  if (!courseId) {
    return { response: errorResponse("Invalid course id", 400, request) };
  }
  if (!userId) {
    return { response: errorResponse("Invalid authenticated user", 401, request) };
  }

  const db = await getDatabase();
  const course = await db.collection("courses").findOne({ _id: courseId });
  if (!course) {
    return { response: errorResponse("Course not found", 404, request) };
  }

  const isOwner = course.teacherId.equals(userId);
  if (auth.user.role === USER_ROLES.TEACHER && !isOwner) {
    return { response: errorResponse("You may only access your own courses", 403, request) };
  }
  if (auth.user.role === USER_ROLES.STUDENT && course.status === "Cancel") {
    return { response: errorResponse("Course not found", 404, request) };
  }

  return { auth, course, courseId, db, userId };
}

export async function GET(request, { params }) {
  try {
    const context = await getCourseAndUser(request, params);
    if (context.response) return context.response;

    let enrolledStudents;
    if (context.auth.user.role === USER_ROLES.TEACHER) {
      const students = await context.db
        .collection("users")
        .find(
          { _id: { $in: context.course.studentIds || [] }, role: USER_ROLES.STUDENT },
          { projection: { password: 0 } },
        )
        .sort({ username: 1 })
        .toArray();
      enrolledStudents = students.map((student) => ({
        id: student._id.toString(),
        username: student.username,
        email: student.email,
      }));
    }

    return successResponse(
      {
        course: {
          ...serializeCourse(context.course, context.auth.user.id),
          ...(enrolledStudents ? { enrolledStudents } : {}),
        },
      },
      200,
      request,
    );
  } catch (error) {
    console.error("Get course failed:", error);
    return errorResponse("Unable to load course", 500, request);
  }
}

export async function PUT(request, { params }) {
  try {
    const context = await getCourseAndUser(request, params);
    if (context.response) return context.response;
    if (context.auth.user.role !== USER_ROLES.TEACHER) {
      return errorResponse("Only Teachers can update courses", 403, request);
    }

    const validation = validateCourseInput(await request.json());
    if (validation.error) return errorResponse(validation.error, 400, request);
    if (validation.value.maxStudents < (context.course.studentIds || []).length) {
      return errorResponse(
        "Max Student cannot be lower than the current enrollment",
        409,
        request,
      );
    }

    const updateResult = await context.db.collection("courses").updateOne(
      {
        _id: context.courseId,
        teacherId: context.userId,
        $expr: {
          $lte: [
            { $size: { $ifNull: ["$studentIds", []] } },
            validation.value.maxStudents,
          ],
        },
      },
      {
        $set: {
          ...validation.value,
          teacherName: context.auth.user.username,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return errorResponse(
        "Max Student cannot be lower than the current enrollment",
        409,
        request,
      );
    }

    const updatedCourse = await context.db
      .collection("courses")
      .findOne({ _id: context.courseId });

    return successResponse(
      {
        message: "Course updated",
        course: serializeCourse(updatedCourse, context.auth.user.id),
      },
      200,
      request,
    );
  } catch (error) {
    console.error("Update course failed:", error);
    return errorResponse("Unable to update course", 500, request);
  }
}

export async function DELETE(request, { params }) {
  try {
    const context = await getCourseAndUser(request, params);
    if (context.response) return context.response;
    if (context.auth.user.role !== USER_ROLES.TEACHER) {
      return errorResponse("Only Teachers can delete courses", 403, request);
    }
    if ((context.course.studentIds || []).length > 0) {
      return errorResponse(
        "A course with enrolled Students cannot be deleted",
        409,
        request,
      );
    }

    const deleteResult = await context.db.collection("courses").deleteOne({
      _id: context.courseId,
      teacherId: context.userId,
      $expr: {
        $eq: [{ $size: { $ifNull: ["$studentIds", []] } }, 0],
      },
    });
    if (deleteResult.deletedCount === 0) {
      return errorResponse(
        "A course with enrolled Students cannot be deleted",
        409,
        request,
      );
    }

    return successResponse({ message: "Course deleted" }, 200, request);
  } catch (error) {
    console.error("Delete course failed:", error);
    return errorResponse("Unable to delete course", 500, request);
  }
}
