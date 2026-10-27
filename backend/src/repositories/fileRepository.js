const fs = require('node:fs/promises');
const path = require('node:path');

function createFileRepository(storageDirectory) {
  const resolvedStorageDirectory = path.resolve(storageDirectory);

  function resolveStoragePath(storageKey) {
    if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(storageKey)) {
      throw new Error('Storage key inválida.');
    }

    const resolvedPath = path.resolve(resolvedStorageDirectory, storageKey);
    const relativePath = path.relative(resolvedStorageDirectory, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Storage path inválido.');
    }

    return resolvedPath;
  }

  return {
    async getStoragePath(storageKey) {
      const filePath = resolveStoragePath(storageKey);
      const realStorageDirectory = await fs.realpath(resolvedStorageDirectory);
      const realFilePath = await fs.realpath(filePath);
      const relativePath = path.relative(realStorageDirectory, realFilePath);

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error('Storage path inválido.');
      }

      return realFilePath;
    },

    async getUsage() {
      let entries;
      try {
        entries = await fs.readdir(resolvedStorageDirectory, { withFileTypes: true });
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { fileCount: 0, totalBytes: 0 };
        }
        throw error;
      }

      const regularFiles = entries.filter((entry) => entry.isFile() && entry.name !== '.gitkeep');
      const sizes = await Promise.all(
        regularFiles.map(async (entry) => {
          const stats = await fs.stat(path.join(resolvedStorageDirectory, entry.name));
          return stats.size;
        }),
      );

      return {
        fileCount: regularFiles.length,
        totalBytes: sizes.reduce((total, size) => total + size, 0),
      };
    },

    async remove(storageKey) {
      try {
        await fs.unlink(resolveStoragePath(storageKey));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

module.exports = createFileRepository;