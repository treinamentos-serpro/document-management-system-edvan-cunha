---
description: Mapeia e prioriza pontos de observabilidade para instrumentação, sem alterar o código.
name: mapear-observabilidade
argument-hint: escopo opcional (ex. backend/src ou fluxo de upload)
agent: agent
---

# Mapear pontos de observabilidade

Analise `${input:escopo:escopo a mapear; se vazio, analise o fluxo completo do DMS}` e produza um mapeamento de pontos de observabilidade que devem ser instrumentados. Trate o escopo como somente leitura: não edite arquivos, não implemente instrumentação, não instale dependências e não presuma ferramentas ou serviços externos.

## Contexto do projeto

- Backend Node.js + Express, organizado em `routes -> controllers -> services -> repositories`.
- Upload com `multer.diskStorage` para o filesystem local em `backend/storage`.
- Metadados dos documentos mantidos em memória.
- Fluxos principais: upload, listagem e download de documentos.
- Frontend React consome a API com `fetch` por meio do prefixo `/api`.

Leia os arquivos relevantes do escopo e baseie cada recomendação em uma rota, função, módulo ou limite arquitetural encontrado. Não invente símbolos, comportamentos já instrumentados ou infraestrutura. Diferencie claramente o que já existe do que é recomendado. Quando o repositório não fornecer evidência suficiente, registre a lacuna como pergunta ou hipótese.

## O que mapear

1. Eventos e limites relevantes de entrada/saída: requisições HTTP, validações, regras de negócio, operações de filesystem, persistência dos metadados em memória e chamadas do frontend.
2. Sinais recomendados em cada ponto: logs estruturados, métricas e spans de trace distribuído. Explique o propósito de cada sinal e o evento que deve gerá-lo.
3. Correlação entre uma requisição HTTP, o fluxo de upload/download e operações internas. Recomende propagação de `trace_id` ou identificador de requisição quando aplicável; não proponha armazenar esse identificador nos metadados persistidos do documento.
4. Falhas e degradações a detectar, incluindo validação, limite de tamanho, gravação/leitura de arquivo, metadado ausente, respostas HTTP de erro e falhas de comunicação do frontend.
5. Métricas operacionais úteis, com tipo, unidade, dimensões de baixa cardinalidade e interpretação. Considere latência, volume, erros, tamanho de upload por faixas, quantidade de documentos e erros de filesystem apenas quando houver base para coletá-los.
6. Privacidade e cardinalidade: não registre conteúdo de arquivos, nomes originais, IDs de documento, IDs de usuário, caminhos locais, dados de formulário ou outros dados pessoais como labels de métricas. Se algum campo for indispensável em log, justifique, minimize e indique a necessidade de mascaramento ou retenção limitada.
7. Lacunas de observabilidade, recomendações ordenadas por prioridade e perguntas que precisam de decisão antes de instrumentar.

## Formato da resposta

### Escopo e evidências

Informe o escopo analisado, os fluxos cobertos e as limitações encontradas. Use referências verificáveis a arquivos e símbolos; não invente números de linha.

### Resumo

Apresente os riscos operacionais mais importantes e as prioridades de instrumentação em poucos itens.

### Mapa de pontos

Monte uma tabela com as colunas:

| Prioridade | Fluxo / evento | Ponto no código | Sinal recomendado | Quando registrar | Campos ou dimensões seguras | Objetivo operacional |
| --- | --- | --- | --- | --- | --- | --- |

Use prioridade `P0` para lacunas que impedem detectar falha ou indisponibilidade, `P1` para diagnóstico e tendência operacional, e `P2` para refinamentos. Em cada linha, informe se o sinal já existe, está parcial ou precisa ser implementado.

### Métricas e traces

Liste nomes sugeridos, tipo de métrica, unidade, dimensões de baixa cardinalidade e spans/atributos recomendados. Use nomes descritivos e independentes de fornecedor. Não transforme IDs, nomes de arquivo ou URLs com parâmetros em dimensões.

### Alertas e painéis

Sugira alertas e painéis apenas quando apoiados pelos sinais propostos. Não invente limites numéricos sem SLO, baseline ou requisito no repositório; indique quais dados são necessários para definir os limites.

### Sequência de instrumentação

Ordene a adoção em etapas pequenas, indicando dependências e o resultado observável esperado de cada etapa. Esta sequência é um plano: não faça as alterações.

### Lacunas e decisões

Liste perguntas abertas, hipóteses adotadas e riscos de privacidade, cardinalidade ou perda de sinais. Separe fatos encontrados de recomendações.
