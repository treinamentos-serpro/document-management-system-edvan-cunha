import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

function formatUploadedAt(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getFileLabel(fileName) {
  const extension = fileName.split('.').pop();
  return extension && extension !== fileName
    ? extension.slice(0, 4).toUpperCase()
    : 'FILE';
}

export default function DocumentList({ apiToken, documents, isLoading, error, onRefresh }) {
  return (
    <>
      <div className="library-heading">
        <div>
          <p className="eyebrow">02 <span>/</span> BIBLIOTECA</p>
          <h2 id="library-title">Todos os arquivos</h2>
        </div>
        <button
          className="refresh-button"
          type="button"
          onClick={onRefresh}
          aria-label="Atualizar lista de documentos"
          title="Atualizar lista"
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>

      <div className="list-meta" aria-live="polite">
        <span>DOCUMENTO</span>
        <span>{isLoading ? 'ATUALIZANDO' : `${documents.length} ${documents.length === 1 ? 'ITEM' : 'ITENS'}`}</span>
      </div>

      {error ? (
        <div className="list-state list-error" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={onRefresh}>Tentar novamente</button>
        </div>
      ) : isLoading ? (
        <p className="list-state" role="status">Carregando documentos…</p>
      ) : documents.length === 0 ? (
        <div className="list-state empty-state">
          <span aria-hidden="true">—</span>
          <p>Nenhum documento enviado.</p>
        </div>
      ) : (
        <ul className="document-list">
          {documents.map((documentItem) => (
            <li className="document-row" key={documentItem.id}>
              <span className="file-mark" aria-hidden="true">{getFileLabel(documentItem.originalName)}</span>
              <span className="document-details">
                <span className="document-name" title={documentItem.originalName}>{documentItem.originalName}</span>
                <span className="document-meta">
                  {formatFileSize(documentItem.size)} <span aria-hidden="true">·</span> {formatUploadedAt(documentItem.uploadedAt)}
                </span>
              </span>
              <DownloadButton apiToken={apiToken} documentItem={documentItem} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}