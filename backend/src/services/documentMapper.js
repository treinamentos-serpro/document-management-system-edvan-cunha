const crypto = require('node:crypto');
const path = require('node:path');

function sanitizeOriginalName(value) {
  const basename = path.basename(String(value || '').replace(/\\/g, '/'));
  return basename.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'document';
}

function createDocumentRecord(uploadedFile, owner) {
  return {
    id: crypto.randomUUID(),
    originalName: sanitizeOriginalName(uploadedFile.originalname),
    size: uploadedFile.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: 'application/octet-stream',
    storageKey: uploadedFile.filename,
  };
}

function toPublicDocument(document) {
  const { storageKey, ...publicDocument } = document;
  return publicDocument;
}

function toDownloadDetails(document, filePath) {
  return {
    filePath,
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

module.exports = {
  createDocumentRecord,
  toDownloadDetails,
  toPublicDocument,
};