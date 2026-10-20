import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const password = "Demo123!";
const usersToSeed = [
  { username: "student1", email: "student1@example.com", role: "Student" },
  { username: "student2", email: "student2@example.com", role: "Student" },
  { username: "student3", email: "student3@example.com", role: "Student" },
  { username: "teacher1", email: "teacher1@example.com", role: "Teacher" },
  { username: "teacher2", email: "teacher2@example.com", role: "Teacher" },
  { username: "teacher3", email: "teacher3@example.com", role: "Teacher" },
];

const coursesToSeed = [
  {
    seedKey: "web-foundations",
    teacherEmail: "teacher1@example.com",
    name: "Web Development Foundations",
    durationDays: 30,
    topics: ["HTML", "CSS", "JavaScript"],
    price: 4900,
    maxStudents: 20,
    status: "Open",
    enrolledEmails: ["student1@example.com"],
  },
  {
    seedKey: "react-apps",
    teacherEmail: "teacher2@example.com",
    name: "Modern React Applications",
    durationDays: 24,
    topics: ["React", "Routing", "State management"],
    price: 5900,
    maxStudents: 15,
    status: "Open",
    enrolledEmails: [],
  },
  {
    seedKey: "mongodb-api",
    teacherEmail: "teacher3@example.com",
    name: "MongoDB API Design",
    durationDays: 18,
    topics: ["MongoDB", "REST APIs", "Security"],
    price: 5500,
    maxStudents: 12,
    status: "Close",
    enrolledEmails: [],
  },
  {
    seedKey: "cancelled-sample",
    teacherEmail: "teacher1@example.com",
    name: "Cancelled Sample Course",
    durationDays: 10,
    topics: ["Testing"],
    price: 1000,
    maxStudents: 5,
    status: "Cancel",
    enrolledEmails: [],
  },
];

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "cx4107_courses");
  const users = db.collection("users");
  const courses = db.collection("courses");
  const passwordHash = await bcrypt.hash(password, 12);

  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ username: 1 }, { unique: true });
  await courses.createIndex({ seedKey: 1 }, { unique: true, sparse: true });

  for (const user of usersToSeed) {
    await users.updateOne(
      { email: user.email },
      {
        $set: { ...user, password: passwordHash, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  const seededUsers = await users
    .find({ email: { $in: usersToSeed.map((user) => user.email) } })
    .toArray();
  const usersByEmail = new Map(seededUsers.map((user) => [user.email, user]));

  for (const course of coursesToSeed) {
    const teacher = usersByEmail.get(course.teacherEmail);
    const studentIds = course.enrolledEmails.map(
      (email) => usersByEmail.get(email)._id,
    );

    await courses.updateOne(
      { seedKey: course.seedKey },
      {
        $set: {
          name: course.name,
          durationDays: course.durationDays,
          topics: course.topics,
          price: course.price,
          maxStudents: course.maxStudents,
          status: course.status,
          teacherId: teacher._id,
          teacherName: teacher.username,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          seedKey: course.seedKey,
          studentIds,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  console.log("Seed complete: 3 Students, 3 Teachers, and 4 sample courses.");
  console.log(`All test accounts use password: ${password}`);
} finally {
  await client.close();
}
