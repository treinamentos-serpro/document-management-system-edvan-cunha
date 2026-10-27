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
  const [apiToken, setApiToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setLoadError('');

    listDocuments({ signal: controller.signal, token: apiToken })
      .then((nextDocuments) => {
        setDocuments(nextDocuments);
        setAuthRequired(false);
        setAuthError('');
      })
      .catch((error) => {
        if (error.status === 401) {
          setAuthRequired(true);
          setAuthError(apiToken ? 'A chave de acesso não foi reconhecida.' : '');
        } else if (error.name !== 'AbortError') {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [apiToken, refreshKey]);

  function handleAccessSubmit(event) {
    event.preventDefault();
    if (!tokenInput.trim()) {
      return;
    }

    setApiToken(tokenInput.trim());
    setTokenInput('');
    setAuthError('');
    setRefreshKey((currentKey) => currentKey + 1);
  }

  function handleUpload(document) {
    setNotice(`${document.originalName} foi enviado.`);
    setRefreshKey((currentKey) => currentKey + 1);
  }

  if (authRequired) {
    return (
      <main className="app-shell access-shell">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Documentos, início">
            <span className="brand-mark" aria-hidden="true">D</span>
            <span>Documentos</span>
          </a>
          <div className="storage-status">ACESSO RESTRITO</div>
        </header>
        <section className="access-panel" aria-labelledby="access-title">
          <p className="eyebrow">BIBLIOTECA <span>/</span> ACESSO</p>
          <h1 id="access-title">Chave de acesso<span className="heading-period">.</span></h1>
          <p className="access-copy">Informe a chave configurada para este servidor.</p>
          <form className="access-form" onSubmit={handleAccessSubmit}>
            <label htmlFor="api-token">Chave de acesso</label>
            <input
              autoComplete="off"
              id="api-token"
              name="apiToken"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              required
            />
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <button className="upload-submit" type="submit">Acessar documentos</button>
          </form>
        </section>
      </main>
    );
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
            apiToken={apiToken}
            onRefresh={() => setRefreshKey((currentKey) => currentKey + 1)}
          />
        </section>

        <aside className="upload-panel" aria-labelledby="upload-title">
          <div className="panel-heading">
            <p className="eyebrow">01 <span>/</span> NOVO ENVIO</p>
            <h2 id="upload-title">Adicionar arquivo</h2>
          </div>
          <UploadComponent apiToken={apiToken} onUploaded={handleUpload} />
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
