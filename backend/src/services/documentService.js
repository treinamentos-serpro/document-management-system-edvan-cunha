const crypto = require('node:crypto');
const path = require('node:path');

function toPublicDocument(document) {
  const { storageKey, ...publicDocument } = document;
  return publicDocument;
}

function createDocumentService({ documentRepository, fileRepository, owner }) {
  return {
    async createDocument(uploadedFile) {
      const originalName = path.basename(uploadedFile.originalname.replace(/\\/g, '/')) || 'document';
      const document = {
        id: crypto.randomUUID(),
        originalName,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        owner,
        mimeType: uploadedFile.mimetype || 'application/octet-stream',
        storageKey: uploadedFile.filename,
      };

      try {
        await documentRepository.save(document);
      } catch (error) {
        await fileRepository.remove(document.storageKey).catch(() => {});
        throw error;
      }

      return toPublicDocument(document);
    },

    async listDocuments() {
      const documents = await documentRepository.findByOwner(owner);
      return documents
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },

    async findDownload(id) {
      const document = await documentRepository.findById(id);
      if (!document || document.owner !== owner) {
        return null;
      }

      return {
        filePath: fileRepository.getStoragePath(document.storageKey),
        originalName: document.originalName,
        mimeType: document.mimeType,
      };
    },
  };
}

module.exports = createDocumentService;