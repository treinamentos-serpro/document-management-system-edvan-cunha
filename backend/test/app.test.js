const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const appModule = require('../src/app');
const createFileRepository = require('../src/repositories/fileRepository');

async function startTestServer(options = {}) {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const token = 'test-api-token';
  const app = appModule.createApp({
    apiToken: token,
    maxDocumentCount: options.maxDocumentCount ?? 10,
    maxFileSizeBytes: options.maxFileSizeBytes ?? 1024,
    maxTotalStorageBytes: options.maxTotalStorageBytes ?? 2048,
    owner: 'test-owner',
    storageDirectory,
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    storageDirectory,
    token,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await fs.rm(storageDirectory, { recursive: true, force: true });
    },
  };
}

function authenticatedFetch(context, path, options = {}) {
  return fetch(`${context.baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      authorization: `Bearer ${context.token}`,
    },
  });
}

test('o app backend é exportado', () => {
  assert.ok(appModule, 'o app deve estar definido');
  assert.strictEqual(typeof appModule, 'function', 'o app Express deve ser uma função');
});

test('exige DMS_API_TOKEN em produção', () => {
  assert.throws(
    () => appModule.createApp({ apiToken: '', nodeEnv: 'production' }),
    /DMS_API_TOKEN deve ter pelo menos 32 caracteres/,
  );
  assert.throws(
    () => appModule.createApp({ apiToken: 'short-token', nodeEnv: 'production' }),
    /DMS_API_TOKEN deve ter pelo menos 32 caracteres/,
  );
  assert.doesNotThrow(() => appModule.createApp({
    apiToken: 'a'.repeat(32),
    nodeEnv: 'production',
  }));
});

test('mantém o health check público', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/health`);
    assert.strictEqual(response.status, 200);
    assert.ok(response.headers.get('x-request-id'));
  } finally {
    await context.close();
  }
});

test('exige o token configurado para acessar documentos', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/documents`);
    assert.strictEqual(response.status, 401);
    assert.strictEqual((await response.json()).error.code, 'UNAUTHORIZED');

    const authorizedResponse = await authenticatedFetch(context, '/documents');
    assert.strictEqual(authorizedResponse.status, 200);
  } finally {
    await context.close();
  }
});

test('envia, lista e baixa um documento', async () => {
  const context = await startTestServer();

  try {
    const missingFileResponse = await authenticatedFetch(context, '/upload', { method: 'POST' });
    assert.strictEqual(missingFileResponse.status, 400);
    assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

    const missingDocumentResponse = await authenticatedFetch(context, '/documents/missing/download');
    assert.strictEqual(missingDocumentResponse.status, 404);

    const form = new FormData();
    form.append('file', new Blob(['conteudo do documento'], { type: 'text/plain' }), 'documento.txt');

    const uploadResponse = await authenticatedFetch(context, '/upload', {
      method: 'POST',
      body: form,
    });
    const uploadBody = await uploadResponse.json();
    assert.strictEqual(uploadResponse.status, 201, JSON.stringify(uploadBody));

    const { document } = uploadBody;
    assert.strictEqual(document.originalName, 'documento.txt');
    assert.strictEqual(document.size, 21);
    assert.strictEqual(document.owner, 'test-owner');
    assert.strictEqual(Object.hasOwn(document, 'storageKey'), false);
    const storageStats = await fs.stat(context.storageDirectory);
    assert.strictEqual(storageStats.mode & 0o777, 0o700);

    const listResponse = await authenticatedFetch(context, '/documents');
    assert.strictEqual(listResponse.status, 200);
    const { documents } = await listResponse.json();
    assert.deepStrictEqual(documents.map(({ id }) => id), [document.id]);

    const downloadResponse = await authenticatedFetch(context, `/documents/${document.id}/download`);
    assert.strictEqual(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get('content-type'), /application\/octet-stream/);
    assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
    assert.strictEqual(await downloadResponse.text(), 'conteudo do documento');
  } finally {
    await context.close();
  }
});

test('rejeita upload acima do limite por arquivo', async () => {
  const context = await startTestServer({ maxFileSizeBytes: 4 });

  try {
    const form = new FormData();
    form.append('file', new Blob(['12345']), 'large.txt');

    const response = await authenticatedFetch(context, '/upload', {
      method: 'POST',
      body: form,
    });

    assert.strictEqual(response.status, 413);
    assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
  } finally {
    await context.close();
  }
});

test('rejeita upload que excede a quota total e remove o arquivo temporário', async () => {
  const context = await startTestServer({ maxTotalStorageBytes: 4 });

  try {
    const form = new FormData();
    form.append('file', new Blob(['12345']), 'quota.txt');

    const response = await authenticatedFetch(context, '/upload', {
      method: 'POST',
      body: form,
    });

    assert.strictEqual(response.status, 413);
    assert.strictEqual((await response.json()).error.code, 'STORAGE_LIMIT_EXCEEDED');
    assert.deepStrictEqual(await fs.readdir(context.storageDirectory), []);
  } finally {
    await context.close();
  }
});

test('limita a quantidade total de documentos armazenados', async () => {
  const context = await startTestServer({ maxDocumentCount: 1 });

  try {
    for (const name of ['first.txt', 'second.txt']) {
      const form = new FormData();
      form.append('file', new Blob([name]), name);
      const response = await authenticatedFetch(context, '/upload', {
        method: 'POST',
        body: form,
      });

      if (name === 'first.txt') {
        assert.strictEqual(response.status, 201);
      } else {
        assert.strictEqual(response.status, 413);
        assert.strictEqual((await response.json()).error.code, 'STORAGE_LIMIT_EXCEEDED');
      }
    }

    const files = await fs.readdir(context.storageDirectory);
    assert.strictEqual(files.length, 1);
  } finally {
    await context.close();
  }
});

test('rejeita campos adicionais no multipart', async () => {
  const context = await startTestServer();

  try {
    const form = new FormData();
    form.append('file', new Blob(['conteudo']), 'documento.txt');
    form.append('owner', 'outro-usuario');

    const response = await authenticatedFetch(context, '/upload', {
      method: 'POST',
      body: form,
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'LIMIT_FIELD_COUNT');
  } finally {
    await context.close();
  }
});

test('impede storage keys que escapam do diretório local', async () => {
  const repository = createFileRepository('/tmp/dms-storage-test');
  await assert.rejects(repository.getStoragePath('../outside'), /inválida/);
});

test('impede que symlinks no storage apontem para fora do diretório', async () => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-path-test-'));
  const storageDirectory = path.join(rootDirectory, 'storage');
  const outsideFile = path.join(rootDirectory, 'outside.txt');
  const storageKey = '123e4567-e89b-12d3-a456-426614174000';

  try {
    await fs.mkdir(storageDirectory);
    await fs.writeFile(outsideFile, 'private');
    await fs.symlink(outsideFile, path.join(storageDirectory, storageKey));

    const repository = createFileRepository(storageDirectory);
    await assert.rejects(repository.getStoragePath(storageKey), /inválido/);
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true });
  }
});
