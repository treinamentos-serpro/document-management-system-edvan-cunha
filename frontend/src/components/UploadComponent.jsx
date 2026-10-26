import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';
import { formatFileSize } from '../utils/formatFileSize.js';

export default function UploadComponent({ onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const document = await uploadDocument(selectedFile);
      onUploaded(document);
      setSelectedFile(null);
      fileInputRef.current.value = '';
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0] || null);
    setError('');
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    fileInputRef.current.value = '';
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="upload-dropzone" htmlFor="document-file">
        <span className="upload-symbol" aria-hidden="true">↑</span>
        <span className="dropzone-title">Selecione um documento</span>
        <span className="dropzone-hint">Escolha um arquivo do seu dispositivo</span>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          id="document-file"
          name="file"
          type="file"
          onChange={handleFileChange}
        />
      </label>

      {selectedFile && (
        <div className="selected-file" aria-live="polite">
          <span className="selected-file-mark" aria-hidden="true">DOC</span>
          <span className="selected-file-details">
            <span className="selected-file-name" title={selectedFile.name}>{selectedFile.name}</span>
            <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
          </span>
          <button
            className="clear-file-button"
            type="button"
            onClick={clearSelectedFile}
            aria-label="Remover arquivo selecionado"
            title="Remover arquivo"
          >
            ×
          </button>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <button
        className="upload-submit"
        type="submit"
        disabled={!selectedFile || isUploading}
        aria-busy={isUploading}
      >
        <span aria-hidden="true">{isUploading ? '…' : '↑'}</span>
        {isUploading ? 'Enviando arquivo' : 'Enviar documento'}
      </button>
    </form>
  );
}