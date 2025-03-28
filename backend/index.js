require("dotenv").config();
const express = require("express");
const { createHandler } = require("graphql-http/lib/use/express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const schema = require("./schema");
const uploadRoutes = require("./routes");
const path = require("path");

const app = express();

// CORS
app.use(
  cors({
    origin: "*", // tighten down in production: origin: ["https://website.tld:3000", "https://11.11.11.11:3000"]
    credentials: true,
  })
);

// JSON
app.use(express.json());

// Serving uploaded pictures for notes before helmet
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Helmet
app.use(helmet());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "⏱️ Too many requests from this IP, please try again later.",
  /*handler: (req, res, next, options) => {
    console.warn(`⚠️ Rate limit hit: ${req.ip} tried ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },*/
});
app.use("/", apiLimiter);
app.use("/graphql", apiLimiter);
app.use("/api", apiLimiter);

// Connect to MongoDB
const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};
mongoose
  .connect(process.env.MONGO_URI, clientOptions)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// GraphQL API on /graphql
app.all(
  "/graphql",
  createHandler({
    schema: schema,
    context: (req) => ({ req }),
  })
);

// Image uploads and URL metadata fetch on /api
app.use("/api", uploadRoutes);

// Start app
const PORT = process.env.PORT || 50011;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
