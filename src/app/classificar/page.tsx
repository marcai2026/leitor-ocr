"use client";

import { useState } from "react";

type ItemStatus = "pending" | "classifying" | "done" | "error";

type ClassificationItem = {
  id: string;
  file: File;
  status: ItemStatus;
  label?: string;
  tipo?: string;
  confidence?: number;
  error?: string;
};

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function statusLabel(item: ClassificationItem) {
  if (item.status === "classifying") return "Classificando...";
  if (item.status === "pending") return "Aguardando";
  if (item.status === "error") return item.error || "Erro";
  return item.label || "Inválido";
}

function statusClass(item: ClassificationItem) {
  if (item.status === "classifying" || item.status === "pending") {
    return "bg-[var(--mist)] text-[var(--ink-soft)]";
  }
  if (item.status === "error" || item.tipo === "invalido") {
    return "bg-red-100 text-red-700";
  }
  return "bg-[var(--lime)] text-black";
}

const ClassificarPage = () => {
  const [items, setItems] = useState<ClassificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (selectedFiles.length > 1) {
      setItems([]);
      setError("Envie apenas 1 arquivo por vez.");
      event.target.value = "";
      return;
    }

    const file = selectedFiles[0];

    if (!isAllowedFile(file)) {
      setItems([]);
      setError("Selecione um arquivo PDF, JPG, JPEG ou PNG.");
      event.target.value = "";
      return;
    }

    setError(null);
    setItems([
      {
        id: `${file.name}-${file.size}-${Date.now()}`,
        file,
        status: "pending",
      },
    ]);
  };

  const handleClassify = async () => {
    if (items.length === 0) {
      setError("Nenhum arquivo selecionado.");
      return;
    }

    setLoading(true);
    setError(null);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: "classifying",
        label: undefined,
        tipo: undefined,
        confidence: undefined,
        error: undefined,
      }))
    );

    try {
      const formData = new FormData();
      items.forEach((item) => formData.append("files", item.file));

      const response = await fetch("/api/classificar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao classificar os documentos.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Resposta inválida do servidor.");
      }

      setItems((prev) =>
        prev.map((item, index) => {
          const result = data[index];
          if (!result) {
            return {
              ...item,
              status: "error",
              error: "Sem resultado",
              tipo: "invalido",
              label: "Inválido",
            };
          }

          return {
            ...item,
            status: "done",
            tipo: result.tipo,
            label: result.label,
            confidence:
              typeof result.confidence === "number" ? result.confidence : 0,
            error: result.error,
          };
        })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao enviar os arquivos."
      );
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          status: "error",
          error: "Falha na classificação",
          tipo: "invalido",
          label: "Inválido",
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="site-grid min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--teal)]">
            Classificação
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--ink)]">
            Classificar documentos
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Envie 1 arquivo por vez (PDF, JPG, JPEG ou PNG). Abaixo de 70% de
            confiança o resultado é marcado como inválido.
          </p>
        </div>

        <div className="rounded-md border border-[var(--line)] bg-white/80 p-4">
          <input
            type="file"
            accept=".pdf,.png,.jpeg,.jpg,application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            className="w-full rounded-md border border-[var(--line)] bg-white p-2"
          />

          <button
            onClick={handleClassify}
            disabled={loading || items.length === 0}
            className={`mt-4 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition ${
              loading || items.length === 0
                ? "cursor-not-allowed bg-gray-400"
                : "bg-[var(--ink)] hover:bg-[var(--ink-soft)]"
            }`}
          >
            {loading ? "Classificando..." : "Classificar arquivo"}
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-100 p-4 text-red-800">{error}</div>
        )}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-md border border-[var(--line)] bg-white/90 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {item.file.name}
                  </p>
                  {typeof item.confidence === "number" &&
                    item.status === "done" && (
                      <p className="text-xs text-[var(--ink-soft)]">
                        Confiança: {(item.confidence * 100).toFixed(1)}%
                        {item.confidence > 0 &&
                        item.confidence < 0.7 &&
                        item.tipo === "invalido"
                          ? " (abaixo do limiar 70%)"
                          : ""}
                      </p>
                    )}
                  {item.error && item.status === "done" && (
                    <p className="mt-0.5 text-xs text-red-600">{item.error}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${statusClass(item)}`}
                >
                  {statusLabel(item)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default ClassificarPage;
