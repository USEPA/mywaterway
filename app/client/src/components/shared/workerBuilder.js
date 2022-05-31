export default function buildWorker(work) {
  const code = work.toString();
  const blob = new Blob([`(${code})()`], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob), { type: 'module' });
}
