const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const createDocumentController = require('./controllers/documentController');
const createDocumentRepository = require('./repositories/documentRepository');
const createFileRepository = require('./repositories/fileRepository');
const createDocumentRoutes = require('./routes/documentRoutes');
const createDocumentService = require('./services/documentService');

function positiveInteger(value, fallback) {
  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function createApp(options = {}) {
  const environment = options.nodeEnv || process.env.NODE_ENV;
  const apiToken = options.apiToken !== undefined ? options.apiToken : process.env.DMS_API_TOKEN;
  if (environment === 'production' && (!apiToken || Buffer.byteLength(apiToken) < 32)) {
    throw new Error('DMS_API_TOKEN deve ter pelo menos 32 caracteres em produção.');
  }

  const maxFileSizeBytes = options.maxFileSizeBytes
    || positiveInteger(process.env.MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024);
  const maxTotalStorageBytes = options.maxTotalStorageBytes
    || positiveInteger(process.env.MAX_TOTAL_STORAGE_BYTES, 1024 * 1024 * 1024);
  const maxDocumentCount = options.maxDocumentCount
    || positiveInteger(process.env.MAX_DOCUMENT_COUNT, 1000);
  const storageDirectory = path.resolve(
    options.storageDirectory || path.resolve(__dirname, '../storage'),
  );
  const documentRepository = createDocumentRepository();
  const fileRepository = createFileRepository(storageDirectory);
  const documentService = createDocumentService({
    documentRepository,
    fileRepository,
    maxDocumentCount,
    maxTotalStorageBytes,
    owner: options.owner || process.env.DMS_DEFAULT_OWNER || 'default',
  });
  const documentController = createDocumentController(documentService);
  const app = express();

  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  app.use(express.json());
  app.use(createDocumentRoutes({
    apiToken,
    controller: documentController,
    storageDirectory,
    maxFileSizeBytes,
  }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
