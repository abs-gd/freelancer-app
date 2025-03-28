const jwt = require("jsonwebtoken");

const authMiddleware = (context, requireAuth = true) => {
  const req = context.req;
  if (!req) throw new Error("Request object is missing in context");

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    if (requireAuth) { throw new Error("Authentication required"); }
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) { throw new Error("Invalid token format"); }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
};

module.exports = authMiddleware;
