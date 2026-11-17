"use client";

import { MouseEvent, ReactNode } from "react";

// Abre un documento de credencial. Los PDF subidos desde la página se guardan como
// "data:application/pdf;base64,..." y los navegadores no dejan abrir ese tipo de dirección
// directamente, así que se convierte a un archivo temporal antes de abrirlo. Los enlaces
// normales (credenciales antiguas) se abren como siempre.
export default function DocumentLink({ url, children }: { url: string; children?: ReactNode }) {
  const isData = url.startsWith("data:");

  function open(ev: MouseEvent<HTMLAnchorElement>) {
    if (!isData) return;
    ev.preventDefault();
    try {
      const [header, base64] = url.split(",");
      const mime = header.slice(5).split(";")[0] || "application/pdf";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (_) {
      alert("No se pudo abrir el documento.");
    }
  }

  return (
    <a href={isData ? "#" : url} target="_blank" rel="noreferrer" onClick={open}>
      {children ?? "Ver documento"}
    </a>
  );
}
