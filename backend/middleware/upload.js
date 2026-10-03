/**
 * FILE UPLOAD MIDDLEWARE (Multer + Sharp)
 * ---------------------------------------
 * multer handles multipart/form-data uploads.
 * sharp compresses/resizes images to standard dimensions.
 * Only JPG/PNG files up to 5MB are accepted.
 */
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// ── MULTER MEMORY STORAGE ─────────────────────────────────────────────────────
// We use memoryStorage so the file is held in buffer temporarily.
// Then sharp processes and saves it — this avoids storing unprocessed files.
const storage = multer.memoryStorage();

// ── FILE FILTER ───────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true); // Accept file
  }
  cb(new ApiError('Only JPG and PNG images are allowed', 400));
};

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

// ── MULTER INSTANCE ───────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ── SHARP PROCESSOR ───────────────────────────────────────────────────────────
// Factory: creates middleware that processes an uploaded image file with sharp
const processImage = (fieldName, outputDir, width, height, quality = 85) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.file && !req.files?.[fieldName]) return next();

    const file = req.file || req.files[fieldName]?.[0];
    if (!file) return next();

    // Ensure output directory exists
    const fullOutputDir = path.join(__dirname, '..', 'uploads', outputDir);
    if (!fs.existsSync(fullOutputDir)) {
      fs.mkdirSync(fullOutputDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const outputPath = path.join(fullOutputDir, filename);

    // Sharp: resize, convert to JPEG, compress
    await sharp(file.buffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .jpeg({ quality }) // Convert all to JPEG for consistency
      .toFile(outputPath);

    // Store the relative URL path so it can be saved to DB
    req.processedImageUrl = `/uploads/${outputDir}/${filename}`;
    req.processedImagePath = outputPath;

    next();
  });
};

// ── MULTIPLE IMAGES PROCESSOR ─────────────────────────────────────────────────
const processMultipleImages = (fieldName, outputDir, width, height) => {
  return asyncHandler(async (req, res, next) => {
    const files = req.files?.[fieldName] || [];
    if (files.length === 0) return next();

    const fullOutputDir = path.join(__dirname, '..', 'uploads', outputDir);
    if (!fs.existsSync(fullOutputDir)) {
      fs.mkdirSync(fullOutputDir, { recursive: true });
    }

    const processedUrls = [];
    for (const file of files) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const outputPath = path.join(fullOutputDir, filename);
      await sharp(file.buffer)
        .resize(width, height, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      processedUrls.push(`/uploads/${outputDir}/${filename}`);
    }

    req.processedImageUrls = processedUrls;
    next();
  });
};

module.exports = { upload, processImage, processMultipleImages };
