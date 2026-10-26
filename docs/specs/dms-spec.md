# Especificação - Document Management System

## 1. Objetivo

Permitir que um usuário envie, liste e baixe documentos armazenados no filesystem local da aplicação, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos associados ao usuário ativo.
- Download de um documento pelo identificador.
- Armazenamento dos arquivos no filesystem local da aplicação.
- Persistência em memória dos metadados durante a execução do processo.

### Fora do escopo

- Armazenamento em nuvem ou em serviços externos.
- Banco de dados para metadados.
- Autenticação, cadastro de usuários e autorização multiusuário.
- Exclusão, versionamento, edição ou compartilhamento de documentos.
- Paginação e busca avançada.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por `multipart/form-data`. |
| RF-02 | O sistema deve gerar um identificador único para cada documento. |
| RF-03 | O sistema deve gravar o conteúdo do arquivo no armazenamento local usando `multer` com `diskStorage`. |
| RF-04 | O sistema deve registrar os metadados do documento em memória após a gravação bem-sucedida do arquivo. |
| RF-05 | O sistema deve rejeitar uma requisição de upload sem arquivo ou com mais de um arquivo. |
| RF-06 | O sistema deve rejeitar arquivos acima do limite configurado. |
| RF-07 | O sistema deve listar os metadados dos documentos do usuário ativo, ordenados do mais recente para o mais antigo. |
| RF-08 | O sistema deve entregar o conteúdo binário de um documento existente como download. |
| RF-09 | O sistema deve responder com erro apropriado quando o documento solicitado não existir ou não estiver associado ao usuário ativo. |
| RF-10 | O sistema deve usar um nome interno gerado pelo servidor para armazenar arquivos, sem usar o nome original como caminho. |
| RF-11 | Se o registro do metadado falhar após a gravação do arquivo, o sistema deve remover o arquivo recém-gravado para evitar conteúdo órfão. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local, por padrão em `backend/storage`, via `multer.diskStorage`. |
| RNF-02 | Os metadados devem permanecer em memória; reiniciar o processo os apaga. |
| RNF-03 | A configuração operacional deve ser obtida por variáveis de ambiente, com valores padrão documentados. |
| RNF-04 | O backend deve seguir a dependência `routes -> controllers -> services -> repositories`. |
| RNF-05 | O frontend deve seguir a organização existente baseada em componentes React e consumir o backend via prefixo `/api`. |
| RNF-06 | O download deve ser enviado como anexo, sem expor o caminho interno de armazenamento. |
| RNF-07 | Erros esperados devem usar respostas consistentes em JSON; downloads bem-sucedidos retornam conteúdo binário. |
| RNF-08 | O limite de upload deve ser configurável; o valor padrão do MVP é 10 MiB. |

## 5. Modelo de dados

### Metadados expostos pela API

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único gerado pelo servidor. |
| `originalName` | string | Nome original fornecido pelo cliente, usado apenas como metadado e nome sugerido no download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | Identificador lógico do usuário ativo. |
| `mimeType` | string | Tipo MIME informado/detectado para o arquivo; usar `application/octet-stream` como fallback. |

### Dados internos de persistência

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storageKey` | string | Nome interno gerado pelo servidor e usado para localizar o arquivo. Não deve ser exposto pela API. |

Os metadados são mantidos em memória pelo processo. Após reinício, os arquivos que continuarem no diretório local não serão considerados documentos registrados, pois não haverá metadados para localizá-los.

## 6. Identidade do usuário no MVP

O seed não define autenticação nem um mecanismo de identidade. Para manter o escopo explícito, o MVP considera um único usuário lógico, identificado pela variável `DMS_DEFAULT_OWNER`, com valor padrão `default`.

O cliente não pode definir `owner` no corpo, query string ou nome do arquivo. Todos os endpoints aplicam o mesmo usuário lógico configurado. Autenticação e isolamento entre usuários ficam fora do escopo desta versão.

## 7. Contratos de API

Prefixo do backend: `/api`, conforme convenção do frontend e proxy do Vite.

### `POST /api/upload`

Envia um documento.

**Entrada**

- `Content-Type: multipart/form-data`
- Campo de arquivo: `file`
- Exatamente um arquivo por requisição.

**Sucesso**

- `201 Created`
- Corpo JSON:

```json
{
	"document": {
		"id": "uuid",
		"originalName": "relatorio.pdf",
		"size": 12345,
		"uploadedAt": "2026-10-26T12:00:00.000Z",
		"owner": "default",
		"mimeType": "application/pdf"
	}
}
```

**Erros**

- `400 Bad Request`: arquivo ausente ou mais de um arquivo.
- `413 Payload Too Large`: arquivo acima do limite configurado.
- `500 Internal Server Error`: falha de armazenamento ou registro dos metadados.

### `GET /api/documents`

Lista os documentos do usuário ativo, do mais recente para o mais antigo.

**Sucesso**

- `200 OK`
- Corpo JSON:

```json
{
	"documents": [
		{
			"id": "uuid",
			"originalName": "relatorio.pdf",
			"size": 12345,
			"uploadedAt": "2026-10-26T12:00:00.000Z",
			"owner": "default",
			"mimeType": "application/pdf"
		}
	]
}
```

Sem documentos, `documents` deve ser um array vazio. A resposta não deve incluir `storageKey`.

### `GET /api/documents/:id/download`

Baixa o arquivo identificado por `id`, desde que esteja associado ao usuário ativo.

**Sucesso**

- `200 OK`
- Conteúdo binário do arquivo.
- `Content-Disposition: attachment` com o nome original sanitizado como nome sugerido.
- `Content-Type` definido pelo MIME registrado, com fallback `application/octet-stream`.

**Erros**

- `404 Not Found`: identificador inexistente ou documento não pertencente ao usuário ativo.
- `500 Internal Server Error`: metadado existente, mas falha ao ler o arquivo local.

### Formato de erro

Erros HTTP em JSON devem seguir o formato:

```json
{
	"error": {
		"code": "FILE_REQUIRED",
		"message": "Envie um arquivo no campo 'file'."
	}
}
```

Os códigos e mensagens devem ser estáveis o bastante para o frontend tratar os casos de erro sem depender de texto interno ou stack trace.

## 8. Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite máximo por arquivo, em bytes. |
| `DMS_DEFAULT_OWNER` | `default` | Identificador lógico do usuário único do MVP. |

O diretório de armazenamento padrão é `backend/storage`. A aplicação não deve enviar arquivos a provedores externos nem transformar o armazenamento em um serviço remoto.

## 9. Decisões arquiteturais

- `routes/` declara os endpoints e encaminha as requisições.
- `controllers/` traduz entrada e saída HTTP e aplica validações básicas de protocolo.
- `services/` concentra regras de negócio, como associação ao usuário ativo e ordenação da listagem.
- `repositories/` coordena os metadados em memória e o acesso aos arquivos locais.
- `multer` com `diskStorage` grava o arquivo; o nome interno é gerado pelo servidor.
- A API expõe metadados, nunca o caminho ou a chave interna do arquivo.
- O usuário do MVP é configurado no servidor; o cliente não escolhe o proprietário do documento.
- Os metadados são voláteis. Não há reconstrução do catálogo a partir dos arquivos no reinício.

## 10. Plano de execução

Este plano descreve etapas futuras de desenvolvimento; não autoriza nem inclui a execução de arquivos de backend ou frontend nesta solicitação.

1. Revisar e aprovar esta especificação, especialmente identidade do usuário, limite de upload e comportamento após reinício.
2. Definir e validar os contratos HTTP, os códigos de erro e os critérios para nome interno e nome de download.
3. Implementar futuramente o backend conforme as camadas e restrições descritas.
4. Implementar futuramente a experiência frontend de upload, listagem, estados de erro e download.
5. Validar futuramente os fluxos de upload, listagem, download, arquivo ausente, limite excedido e reinício do processo.

## 11. Critérios de aceite

- A especificação contempla requisitos funcionais e não funcionais, modelo de dados, contratos de API, decisões arquiteturais e plano em etapas.
- O upload define campo multipart, cardinalidade, resposta de sucesso e erros esperados.
- A listagem define formato, ordenação e resposta vazia.
- O download define comportamento binário, cabeçalhos e resposta para documento inexistente.
- O armazenamento é exclusivamente local, com `multer.diskStorage`; os metadados são explicitamente voláteis.
- O plano não altera nem executa arquivos de backend ou frontend; o único arquivo previsto para esta solicitação é `docs/dms-spec.md`.
