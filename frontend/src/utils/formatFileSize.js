const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  let size = bytes / 1024;
  let unitIndex = 1;

  while (size >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formattedSize = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(size);

  return `${formattedSize} ${SIZE_UNITS[unitIndex]}`;
}