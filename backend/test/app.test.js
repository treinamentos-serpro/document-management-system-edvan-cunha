const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('envia, lista e baixa um documento', async () => {
  const storageDirectory = path.join(__dirname, '../storage');
  const filesBefore = new Set(await fs.readdir(storageDirectory));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const missingFileResponse = await fetch(`${baseUrl}/upload`, { method: 'POST' });
    assert.strictEqual(missingFileResponse.status, 400);
    assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

    const missingDocumentResponse = await fetch(`${baseUrl}/documents/missing/download`);
    assert.strictEqual(missingDocumentResponse.status, 404);

    const form = new FormData();
    form.append('file', new Blob(['conteudo do documento'], { type: 'text/plain' }), 'documento.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: form,
    });
    assert.strictEqual(uploadResponse.status, 201);

    const { document } = await uploadResponse.json();
    assert.strictEqual(document.originalName, 'documento.txt');
    assert.strictEqual(document.size, 21);
    assert.strictEqual(document.owner, 'default');
    assert.strictEqual(Object.hasOwn(document, 'storageKey'), false);

    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(listResponse.status, 200);
    const { documents } = await listResponse.json();
    assert.deepStrictEqual(documents.map(({ id }) => id), [document.id]);

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
    assert.strictEqual(await downloadResponse.text(), 'conteudo do documento');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    const filesAfter = await fs.readdir(storageDirectory);
    await Promise.all(
      filesAfter
        .filter((fileName) => !filesBefore.has(fileName))
        .map((fileName) => fs.unlink(path.join(storageDirectory, fileName))),
    );
  }
});
