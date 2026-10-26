const express = require('express');
const path = require('node:path');
const createDocumentController = require('./controllers/documentController');
const createDocumentRepository = require('./repositories/documentRepository');
const createFileRepository = require('./repositories/fileRepository');
const createDocumentRoutes = require('./routes/documentRoutes');
const createDocumentService = require('./services/documentService');

const app = express();
const PORT = process.env.PORT || 3000;
const configuredFileSize = Number(process.env.MAX_FILE_SIZE_BYTES);
const maxFileSizeBytes = Number.isSafeInteger(configuredFileSize) && configuredFileSize > 0
  ? configuredFileSize
  : 10 * 1024 * 1024;
const storageDirectory = path.resolve(__dirname, '../storage');
const documentRepository = createDocumentRepository();
const fileRepository = createFileRepository(storageDirectory);
const documentService = createDocumentService({
  documentRepository,
  fileRepository,
  owner: process.env.DMS_DEFAULT_OWNER || 'default',
});
const documentController = createDocumentController(documentService);

app.use(express.json());
app.use(createDocumentRoutes({
  controller: documentController,
  storageDirectory,
  maxFileSizeBytes,
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
