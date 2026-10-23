const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const createUpload = ({ allowedMimeTypes, maxFileSize = 10 * 1024 * 1024, files = 10 }) => {
  return multer({
    storage: memoryStorage,
    fileFilter: (req, file, cb) => {
      if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new Error(
            "Invalid file type. Please upload a supported image (JPG, PNG, WebP) or PDF file.",
          ),
          false,
        );
      }

      cb(null, true);
    },
    limits: {
      fileSize: maxFileSize,
      files: files,
    },
  });
};

const profileImageUpload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ],
  maxFileSize: 5 * 1024 * 1024,
  files: 5,
});

const driverDocumentUpload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "application/pdf",
  ],
  maxFileSize: 15 * 1024 * 1024,
  files: 10,
});

const vehicleDocumentUpload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "application/pdf",
  ],
  maxFileSize: 15 * 1024 * 1024,
  files: 10,
});

// Kept as a generic upload for future modules.
const upload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "application/pdf",
  ],
  maxFileSize: 15 * 1024 * 1024,
  files: 10,
});

module.exports = upload;
module.exports.createUpload = createUpload;
module.exports.profileImageUpload = profileImageUpload;
module.exports.driverDocumentUpload = driverDocumentUpload;
module.exports.vehicleDocumentUpload = vehicleDocumentUpload;

