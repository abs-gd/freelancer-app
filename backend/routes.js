const express = require("express");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const metascraper = require("metascraper")([
  require("metascraper-title")(),
  require("metascraper-description")(),
  require("metascraper-image")(),
  require("metascraper-url")(),
]);
const { JSDOM } = require("jsdom");
require("dotenv").config();

const router = express.Router();

// Upload images in notes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });
router.post("/uploadImage", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: 0, message: "No file uploaded" });
  }

  const baseUrl = process.env.PUBLIC_IMAGE_URL || "http://localhost:5000";
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

  return res.status(200).json({
    success: 1,
    file: {
      url: fileUrl,
    },
  });
});

// Fetch metadate for links in notes
router.get("/fetchLink", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ success: 0, message: "No URL provided" });
  }

  try {
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const { window } = new JSDOM(html, { url });
    const metadata = await metascraper({ html, url });

    return res.json({
      success: 1,
      meta: {
        title: metadata.title || url,
        description: metadata.description || "",
        image: { url: metadata.image } || "",
        url: metadata.url || url,
      },
    });
  } catch (err) {
    console.error("Link preview error:", err.message);
    return res
      .status(500)
      .json({ success: 0, message: "Failed to fetch metadata" });
  }
});

module.exports = router;
