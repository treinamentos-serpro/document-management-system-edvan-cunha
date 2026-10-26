const API_PREFIX = '/api';

async function readError(response) {
  try {
    const body = await response.json();
    return body?.error?.message || 'Não foi possível concluir a solicitação.';
  } catch {
    return 'Não foi possível concluir a solicitação.';
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, options);
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData,
  });
  const body = await response.json();
  return body.document;
}

export async function listDocuments({ signal } = {}) {
  const response = await request('/documents', { signal });
  const body = await response.json();
  return body.documents;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}