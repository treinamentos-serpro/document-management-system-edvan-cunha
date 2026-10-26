const fs = require('node:fs/promises');
const path = require('node:path');

function createFileRepository(storageDirectory) {
  return {
    getStoragePath(storageKey) {
      return path.join(storageDirectory, storageKey);
    },

    async remove(storageKey) {
      try {
        await fs.unlink(path.join(storageDirectory, storageKey));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

module.exports = createFileRepository;