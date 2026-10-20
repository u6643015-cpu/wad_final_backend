import { ObjectId } from "mongodb";
import { COURSE_STATUSES } from "./constant";

export function parseObjectId(value) {
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function validateCourseInput(body) {
  const name = String(body.name || "").trim();
  const durationDays = Number(body.durationDays);
  const price = Number(body.price);
  const maxStudents = Number(body.maxStudents);
  const status = String(body.status || "");
  const topics = Array.isArray(body.topics)
    ? body.topics.map((topic) => String(topic).trim()).filter(Boolean)
    : String(body.topics || "")
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean);

  if (!name) return { error: "Course name is required" };
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    return { error: "Duration must be a positive whole number of days" };
  }
  if (topics.length === 0) return { error: "At least one topic is required" };
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be zero or greater" };
  }
  if (!Number.isInteger(maxStudents) || maxStudents < 1) {
    return { error: "Max Student must be a positive whole number" };
  }
  if (!COURSE_STATUSES.includes(status)) {
    return { error: "Status must be Open, Close, or Cancel" };
  }

  return {
    value: { name, durationDays, topics, price, maxStudents, status },
  };
}

export function serializeCourse(course, currentUserId) {
  const studentIds = course.studentIds || [];
  const enrolledCount = studentIds.length;

  return {
    id: course._id.toString(),
    name: course.name,
    durationDays: course.durationDays,
    topics: course.topics,
    price: course.price,
    maxStudents: course.maxStudents,
    status: course.status,
    teacherId: course.teacherId.toString(),
    teacherName: course.teacherName,
    enrolledCount,
    seatsAvailable: Math.max(course.maxStudents - enrolledCount, 0),
    isEnrolled: currentUserId
      ? studentIds.some((id) => id.toString() === currentUserId)
      : false,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}
