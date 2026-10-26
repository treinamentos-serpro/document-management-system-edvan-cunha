function createDocumentRepository() {
  const documents = new Map();

  return {
    async save(document) {
      documents.set(document.id, document);
      return document;
    },

    async findById(id) {
      return documents.get(id) || null;
    },

    async findByOwner(owner) {
      return [...documents.values()].filter((document) => document.owner === owner);
    },
  };
}

module.exports = createDocumentRepository;