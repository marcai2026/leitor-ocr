"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, version } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

type PdfPreviewProps = {
  file: File;
};

export default function PdfPreview({ file }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const container = containerRef.current;
      if (!container) return;

      setStatus("loading");
      setErrorMessage(null);
      container.innerHTML = "";

      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await getDocument({ data }).promise;
        if (cancelled) return;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const maxWidth = Math.min(container.clientWidth || 800, 900);
          const scale = maxWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className =
            "mx-auto mb-4 block max-w-full rounded-sm bg-white shadow-sm";

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          if (cancelled) return;
          container.appendChild(canvas);
        }

        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível renderizar o PDF."
        );
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className="relative h-full overflow-auto p-4">
      {status === "loading" && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--ink-soft)]">
          Carregando PDF...
        </p>
      )}
      {status === "error" && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <div
        ref={containerRef}
        className={status === "ready" ? "" : "min-h-[40vh]"}
      />
    </div>
  );
}
