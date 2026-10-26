import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setLoadError('');

    listDocuments({ signal: controller.signal })
      .then(setDocuments)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [refreshKey]);

  function handleUpload(document) {
    setNotice(`${document.originalName} foi enviado.`);
    setRefreshKey((currentKey) => currentKey + 1);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Documentos, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>Documentos</span>
        </a>
        <div className="storage-status">
          <span className="status-indicator" aria-hidden="true" />
          <span>ARMAZENAMENTO LOCAL</span>
        </div>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">BIBLIOTECA <span>/</span> ARQUIVOS</p>
          <h1 id="page-title">Documentos<span className="heading-period">.</span></h1>
        </div>
        <div className="document-count" aria-live="polite">
          <strong>{String(documents.length).padStart(2, '0')}</strong>
          <span>itens</span>
        </div>
      </section>

      {notice && <p className="upload-notice" role="status">{notice}</p>}

      <div className="workspace-grid">
        <section className="library-panel" aria-labelledby="library-title">
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            error={loadError}
            onRefresh={() => setRefreshKey((currentKey) => currentKey + 1)}
          />
        </section>

        <aside className="upload-panel" aria-labelledby="upload-title">
          <div className="panel-heading">
            <p className="eyebrow">01 <span>/</span> NOVO ENVIO</p>
            <h2 id="upload-title">Adicionar arquivo</h2>
          </div>
          <UploadComponent onUploaded={handleUpload} />
          <p className="local-note">
            <span aria-hidden="true">●</span>
            Arquivo salvo neste servidor
          </p>
        </aside>
      </div>

      <footer className="app-footer">
        <span>DMS <span aria-hidden="true">/</span> ARQUIVO PESSOAL</span>
        <span>METADADOS EM MEMÓRIA</span>
      </footer>
    </main>
  );
}
