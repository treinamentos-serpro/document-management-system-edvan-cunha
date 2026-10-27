const logApiError = require('../utils/logApiError');

function createDocumentController(documentService) {
  return {
    upload: async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: "Envie um arquivo no campo 'file'.",
          },
        });
      }

      const document = await documentService.createDocument(req.file);
      return res.status(201).json({ document });
    },

    list: async (req, res) => {
      const documents = await documentService.listDocuments();
      return res.status(200).json({ documents });
    },

    download: async (req, res) => {
      const download = await documentService.findDownload(req.params.id);
      if (!download) {
        return res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Documento não encontrado.',
          },
        });
      }

      res.type('application/octet-stream');
      return res.download(download.filePath, download.originalName, (error) => {
        if (!error) {
          return;
        }

        logApiError(req, error, 'download_failed', '/documents/:id/download');
        if (res.headersSent) {
          res.destroy(error);
          return;
        }

        res.status(500).json({
          error: {
            code: 'FILE_READ_FAILED',
            message: 'Não foi possível baixar o documento.',
          },
        });
      });
    },
  };
}

module.exports = createDocumentController;