const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const createUploadMiddleware = require('../middlewares/uploadMiddleware');
const logApiError = require('../utils/logApiError');

function createDocumentRoutes({ apiToken, controller, storageDirectory, maxFileSizeBytes }) {
  const router = express.Router();
  const upload = createUploadMiddleware({ storageDirectory, maxFileSizeBytes });

  function authenticate(req, res, next) {
    if (!apiToken) {
      return next();
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    const expectedToken = Buffer.from(apiToken);
    const providedToken = Buffer.from(match?.[1] || '');
    const isValid = providedToken.length === expectedToken.length
      && crypto.timingSafeEqual(providedToken, expectedToken);

    if (!isValid) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Acesso não autorizado.',
        },
      });
    }

    return next();
  }

  router.post('/upload', authenticate, upload, controller.upload);
  router.get('/documents', authenticate, controller.list);
  router.get('/documents/:id/download', authenticate, controller.download);

  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? 'FILE_TOO_LARGE' : error.code || 'INVALID_UPLOAD',
          message: tooLarge
            ? 'O arquivo excede o limite permitido.'
            : 'A requisição de upload é inválida.',
        },
      });
    }

    if (error.code === 'STORAGE_LIMIT_EXCEEDED') {
      if (error.cleanupError) {
        logApiError(req, error, 'upload_cleanup_failed', '/upload');
      }

      return res.status(413).json({
        error: {
          code: error.code,
          message: 'O limite total de armazenamento foi atingido.',
        },
      });
    }

    logApiError(req, error, 'request_failed');
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