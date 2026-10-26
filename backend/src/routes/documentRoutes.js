const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const multer = require('multer');

function createDocumentRoutes({ controller, storageDirectory, maxFileSizeBytes }) {
  const router = express.Router();
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdir(storageDirectory, { recursive: true }, (error) => {
        callback(error, storageDirectory);
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
    },
  });

  router.post('/upload', upload.single('file'), controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);

  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: tooLarge
            ? 'O arquivo excede o limite permitido.'
            : 'A requisição de upload é inválida.',
        },
      });
    }

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro interno.',
      },
    });
  });

  return router;
}

module.exports = createDocumentRoutes;