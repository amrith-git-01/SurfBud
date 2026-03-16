export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 KB";
  const abs = Math.abs(bytes);
  if (abs < 1024) return "0 KB";
  if (abs < 1024 * 1024) {
    const kb = abs / 1024;
    return `${kb % 1 === 0 ? kb : kb.toFixed(1)} KB`;
  }
  if (abs < 1024 * 1024 * 1024) {
    const mb = abs / (1024 * 1024);
    return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`;
  }
  const gb = abs / (1024 * 1024 * 1024);
  return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB`;
}
