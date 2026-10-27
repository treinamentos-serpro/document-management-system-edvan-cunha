const {
  createDocumentRecord,
  toDownloadDetails,
  toPublicDocument,
} = require('./documentMapper');

function createDocumentService({
  documentRepository,
  fileRepository,
  maxDocumentCount,
  maxTotalStorageBytes,
  owner,
}) {
  return {
    async createDocument(uploadedFile) {
      const document = createDocumentRecord(uploadedFile, owner);

      try {
        const usage = await fileRepository.getUsage();
        if (usage.fileCount > maxDocumentCount || usage.totalBytes > maxTotalStorageBytes) {
          const error = new Error('Document storage limit exceeded.');
          error.code = 'STORAGE_LIMIT_EXCEEDED';
          throw error;
        }

        await documentRepository.save(document);
      } catch (error) {
        try {
          await fileRepository.remove(document.storageKey);
        } catch (cleanupError) {
          error.cleanupError = cleanupError;
        }
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

      const filePath = await fileRepository.getStoragePath(document.storageKey);
      return toDownloadDetails(document, filePath);
    },
  };
}

module.exports = createDocumentService;