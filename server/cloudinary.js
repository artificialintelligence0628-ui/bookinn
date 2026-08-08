import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

// Reads either a single CLOUDINARY_URL (cloudinary://key:secret@cloud_name — the
// format Cloudinary's dashboard gives you) or the three separate CLOUDINARY_*
// vars below. The SDK auto-picks up CLOUDINARY_URL from the environment on
// import, so config() here is only needed for the separate-vars fallback.
if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (!cloudinaryConfigured) {
  console.warn(
    "⚠️  Cloudinary is not configured. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME / " +
    "CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET) in your .env — photo/video uploads will fail until you do."
  );
}

// Uploads a buffer (from multer's memoryStorage) straight to Cloudinary without
// ever writing it to disk or base64-encoding it. resource_type: "auto" lets
// Cloudinary detect image vs video from the file itself.
export function uploadBuffer(buffer, { folder = "bookinn", resourceType = "auto" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export function destroyAsset(publicId, resourceType = "image") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
