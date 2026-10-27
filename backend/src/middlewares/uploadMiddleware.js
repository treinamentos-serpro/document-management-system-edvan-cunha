const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');

function createUploadMiddleware({ storageDirectory, maxFileSizeBytes }) {
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdir(storageDirectory, { recursive: true, mode: 0o700 }, (error) => {
        if (error) {
          callback(error);
          return;
        }

        fs.chmod(storageDirectory, 0o700, (chmodError) => {
          callback(chmodError, storageDirectory);
        });
      });
    },
    filename: (req, file, callback) => {
      callback(null, crypto.randomUUID());
    },
  });
  const upload = multer({
    storage,
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1,
      fields: 0,
      parts: 2,
    },
  });

  return upload.single('file');
}

module.exports = createUploadMiddleware;