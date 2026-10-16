const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const createUpload = ({ allowedMimeTypes, maxFileSize = 10 * 1024 * 1024 }) => {
  return multer({
    storage: memoryStorage,
    fileFilter: (req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new Error(
            "Invalid file type. Please upload a supported image or PDF file.",
          ),
          false,
        );
      }

      cb(null, true);
    },
    limits: {
      fileSize: maxFileSize,
      files: 1,
    },
  });
};

const profileImageUpload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  maxFileSize: 5 * 1024 * 1024,
});

const vehicleDocumentUpload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  maxFileSize: 10 * 1024 * 1024,
});

// Kept as a generic upload for future modules.
const upload = createUpload({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
});

module.exports = upload;
module.exports.createUpload = createUpload;
module.exports.profileImageUpload = profileImageUpload;
module.exports.vehicleDocumentUpload = vehicleDocumentUpload;
