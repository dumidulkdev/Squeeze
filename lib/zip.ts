import JSZip from "jszip";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function zipAndSave(
  files: { name: string; blob: Blob }[],
  zipName: string,
  onProgress: (percent: number) => void,
) {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  // Outputs are already compressed, so store without re-compressing (much faster).
  const out = await zip.generateAsync({ type: "blob", compression: "STORE" }, (m) =>
    onProgress(m.percent),
  );
  saveBlob(out, zipName);
}
