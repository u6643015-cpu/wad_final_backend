import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyJWT(req) {
  try {
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return null;
    }
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.log("JWT verification failed:", err.message);
    return null;
  }
}

export function requireUser(request, allowedRoles = []) {
  const user = verifyJWT(request);
  if (!user) return { error: "Authentication required", status: 401 };

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { error: "You are not allowed to perform this operation", status: 403 };
  }

  return { user };
}
