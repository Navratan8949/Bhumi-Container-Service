const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

const saveUploadedFile = async (file, folder) => {
  if (!file) return null;

  const safeFolder = String(folder || "misc").replace(/[^a-zA-Z0-9_-]/g, "");
  const folderPath = path.join(uploadsRoot, safeFolder);

  await fs.mkdir(folderPath, { recursive: true });

  const extension = path.extname(file.originalname || "").toLowerCase();
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(folderPath, filename);

  await fs.writeFile(absolutePath, file.buffer);

  return `/uploads/${safeFolder}/${filename}`;
};

const deleteUploadedFile = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") return;

  // Only delete files created inside our own /uploads directory.
  const normalized = fileUrl.split("?")[0];
  if (!normalized.startsWith("/uploads/")) return;

  const relativePath = normalized.replace(/^\/uploads\//, "");
  const absolutePath = path.resolve(uploadsRoot, relativePath);
  const uploadsRootResolved = path.resolve(uploadsRoot);

  if (
    absolutePath !== uploadsRootResolved &&
    !absolutePath.startsWith(`${uploadsRootResolved}${path.sep}`)
  ) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Delete uploaded file error:", error.message);
    }
  }
};

module.exports = {
  saveUploadedFile,
  deleteUploadedFile,
};
