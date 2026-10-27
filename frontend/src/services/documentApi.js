const API_PREFIX = '/api';

async function readError(response) {
  try {
    const body = await response.json();
    return {
      code: body?.error?.code || 'REQUEST_FAILED',
      message: body?.error?.message || 'Não foi possível concluir a solicitação.',
    };
  } catch {
    return {
      code: 'REQUEST_FAILED',
      message: 'Não foi possível concluir a solicitação.',
    };
  }
}

class ApiError extends Error {
  constructor({ message, code, status }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}, token) {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_PREFIX}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await readError(response);
    throw new ApiError({ ...error, status: response.status });
  }

  return response;
}

export async function uploadDocument(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData,
  }, token);
  const body = await response.json();
  return body.document;
}

export async function listDocuments({ signal, token } = {}) {
  const response = await request('/documents', { signal }, token);
  const body = await response.json();
  return body.documents;
}

export async function downloadDocument(id, token) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, {}, token);
  return response.blob();
}