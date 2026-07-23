"use client";

import { useState } from "react";

type ItemStatus = "pending" | "classifying" | "done" | "error";
type ExtractStatus = "idle" | "extracting" | "done" | "error";

type ExtractedField = {
  key: string;
  label: string;
  value: string;
  confidence: number | null;
};

type ClassificationItem = {
  id: string;
  file: File;
  status: ItemStatus;
  label?: string;
  tipo?: string;
  /** Tipo original da classificação (mantém mesmo se validação marcar inválido) */
  docKind?: string;
  confidence?: number;
  error?: string;
  extractStatus?: ExtractStatus;
  extractError?: string;
  extractedFields?: ExtractedField[];
};

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const GISS_AUTH_URL =
  "https://maceio.giss.com.br/portal/home#/verificacao-autenticidade-nfse";
const NFSE_NACIONAL_URL = "https://www.nfse.gov.br/consultapublica/";
const COPYABLE_FIELDS = new Set([
  "numero",
  "codigo_verificacao",
  "chave_acesso",
  "prestador_cnpj",
  "id_transacao",
  "codigo_autenticacao",
  "pagador_cpf",
  "recebedor_cpf_cnpj",
]);

const NF_SECTIONS = [
  {
    id: "detalhes",
    title: "Detalhes da nota",
    keys: [
      "numero",
      "codigo_verificacao",
      "chave_acesso",
      "data_emissao",
      "competencia",
      "valor_servico",
      "valor_liquido",
      "discriminacao",
    ],
  },
  {
    id: "prestador",
    title: "Prestador",
    keys: ["prestador_nome", "prestador_cnpj"],
  },
  {
    id: "tomador",
    title: "Tomador",
    keys: ["tomador_nome", "tomador_cpf_cnpj"],
  },
] as const;

const CP_SECTIONS = [
  {
    id: "transacao",
    title: "Transação",
    keys: [
      "valor",
      "data_hora_transacao",
      "data_transacao",
      "hora_transacao",
      "id_transacao",
      "tipo_pagamento",
      "forma_pagamento",
      "banco_emissor",
      "codigo_autenticacao",
    ],
  },
  {
    id: "pagador",
    title: "Pagador",
    keys: [
      "pagador_nome",
      "pagador_cpf",
      "pagador_agencia",
      "pagador_conta",
      "pagador_agencia_conta",
    ],
  },
  {
    id: "recebedor",
    title: "Recebedor",
    keys: [
      "recebedor_nome",
      "recebedor_cpf_cnpj",
      "recebedor_instituicao",
    ],
  },
] as const;

function normalizeTipo(tipo?: string) {
  return (tipo || "").toLowerCase().replace(/[\s-]+/g, "_");
}

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CollectIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ViewIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FileIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function statusLabel(item: ClassificationItem) {
  if (item.status === "classifying") return "Classificando...";
  if (item.status === "pending") return "Aguardando";
  if (item.status === "error") return item.error || "Erro";
  const tipo = normalizeTipo(item.tipo);
  if (tipo === "recibo") return "Recibo de comprovante";
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

function isNotaFiscal(item: ClassificationItem) {
  const tipo = normalizeTipo(item.docKind || item.tipo);
  return (
    item.status === "done" &&
    tipo === "nota_fiscal" &&
    typeof item.confidence === "number" &&
    item.confidence >= 0.7
  );
}

function isComprovantePagamento(item: ClassificationItem) {
  const tipo = normalizeTipo(item.docKind || item.tipo);
  const isCp =
    tipo === "comprovante_pagamento" ||
    tipo === "comprovante_de_pagamento" ||
    tipo === "comprovante" ||
    tipo === "recibo";

  return (
    item.status === "done" &&
    isCp &&
    typeof item.confidence === "number" &&
    item.confidence >= 0.7
  );
}

/** Ainda pode extrair/ver mesmo se validação pós-extração marcou inválido */
function canExtract(item: ClassificationItem) {
  if (isNotaFiscal(item)) return true;
  if (!isComprovantePagamento(item)) return false;
  // comprovante classificado ok — permite coletar mesmo após virar inválido na validação
  return true;
}

function isComprovanteModal(item: ClassificationItem) {
  const tipo = normalizeTipo(item.docKind || item.tipo);
  return (
    tipo === "comprovante_pagamento" ||
    tipo === "comprovante_de_pagamento" ||
    tipo === "comprovante" ||
    tipo === "recibo"
  );
}

function openFilePreview(file: File) {
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const ClassificarPage = () => {
  const [items, setItems] = useState<ClassificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const modalItem = items.find((item) => item.id === modalItemId) || null;

  const getFieldValue = (key: string) => {
    const value =
      modalItem?.extractedFields?.find((field) => field.key === key)?.value ||
      "";
    if (!value || value === "Não encontrado") return "";
    return value;
  };

  const codigoVerificacao = getFieldValue("codigo_verificacao");
  const chaveAcessoRaw = getFieldValue("chave_acesso");
  const codigoPareceChave =
    codigoVerificacao.replace(/\D/g, "").length >= 44 ? codigoVerificacao : "";
  const chaveAcesso = chaveAcessoRaw || codigoPareceChave;
  const usaPortalNacional = Boolean(chaveAcesso);
  const podeValidar =
    usaPortalNacional ||
    (Boolean(codigoVerificacao) && !codigoPareceChave);

  const openValidacao = () => {
    const url = usaPortalNacional ? NFSE_NACIONAL_URL : GISS_AUTH_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyFieldValue = async (key: string, value: string) => {
    if (!value || value === "Não encontrado") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

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
    setModalOpen(false);
    setModalItemId(null);
    setCopiedKey(null);
    setItems([
      {
        id: `${file.name}-${file.size}-${Date.now()}`,
        file,
        status: "pending",
        extractStatus: "idle",
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
    setModalOpen(false);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: "classifying",
        label: undefined,
        tipo: undefined,
        confidence: undefined,
        error: undefined,
        extractStatus: "idle",
        extractError: undefined,
        extractedFields: undefined,
        docKind: undefined,
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
            docKind: result.tipo,
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

  const handleExtract = async (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item || !canExtract(item)) return;

    const isNf = isNotaFiscal(item);
    const endpoint = isNf ? "/api/extrair-nf" : "/api/extrair-cp";
    const errorFallback = isNf
      ? "Erro ao coletar dados da NF."
      : "Erro ao coletar dados do comprovante.";

    setItems((prev) =>
      prev.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              extractStatus: "extracting",
              extractError: undefined,
            }
          : entry
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", item.file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || errorFallback);
      }

      setItems((prev) =>
        prev.map((entry) => {
          if (entry.id !== itemId) return entry;

          const fields = Array.isArray(data.fields) ? data.fields : [];
          const cpInvalido = !isNf && data.valido === false;

          return {
            ...entry,
            extractStatus: "done",
            extractedFields: fields,
            extractError: undefined,
            ...(cpInvalido
              ? {
                  tipo: "invalido",
                  label: "Inválido",
                  error:
                    typeof data.motivoInvalido === "string"
                      ? data.motivoInvalido
                      : "Comprovante não válido para pagamento médico.",
                }
              : {}),
          };
        })
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === itemId
            ? {
                ...entry,
                extractStatus: "error",
                extractError:
                  err instanceof Error ? err.message : errorFallback,
              }
            : entry
        )
      );
    }
  };

  const openModal = (itemId: string) => {
    setModalItemId(itemId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItemId(null);
    setCopiedKey(null);
  };

  return (
    <main className="site-grid min-h-full overflow-y-auto px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--teal)]">
            Classificação
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--ink)]">
            Classificar documentos
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Envie 1 arquivo por vez (PDF, JPG, JPEG ou PNG)
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
                className="rounded-md border border-[var(--line)] bg-white/90 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--ink)]">
                      {item.file.name}
                    </p>
                    {typeof item.confidence === "number" &&
                      item.status === "done" && (
                        <p className="text-xs text-[var(--ink-soft)]">
                          Confiabilidade: {(item.confidence * 100).toFixed(1)}%
                          {item.confidence > 0 &&
                          item.confidence < 0.7 &&
                          item.tipo === "invalido"
                            ? " (abaixo do limiar 70%)"
                            : ""}
                        </p>
                      )}
                    {item.error &&
                      item.status === "done" &&
                      !item.error.toLowerCase().includes("limiar") && (
                        <p className="mt-0.5 text-xs text-red-600">{item.error}</p>
                      )}
                    {item.extractError && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {item.extractError}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${statusClass(item)}`}
                    >
                      {statusLabel(item)}
                    </span>

                    <button
                      type="button"
                      onClick={() => openFilePreview(item.file)}
                      className="rounded-md border border-[var(--line)] bg-white p-2 text-[var(--ink-soft)] transition hover:border-[var(--teal)]/50 hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                      title="Visualizar arquivo"
                      aria-label="Visualizar arquivo"
                    >
                      <FileIcon />
                    </button>

                    {canExtract(item) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleExtract(item.id)}
                          disabled={item.extractStatus === "extracting"}
                          className={`rounded-md border p-2 transition ${
                            item.extractStatus === "extracting"
                              ? "cursor-wait border-[var(--teal)]/40 bg-[var(--mist)] text-[var(--teal)]"
                              : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--teal)]/50 hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                          }`}
                          title={
                            item.extractStatus === "extracting"
                              ? "Coletando..."
                              : item.extractStatus === "done"
                                ? "Coletar novamente"
                                : "Coletar dados"
                          }
                          aria-label="Coletar dados"
                        >
                          <CollectIcon
                            className={`h-4 w-4 ${
                              item.extractStatus === "extracting"
                                ? "animate-pulse"
                                : ""
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => openModal(item.id)}
                          disabled={
                            item.extractStatus !== "done" ||
                            !item.extractedFields
                          }
                          className={`rounded-md border p-2 transition ${
                            item.extractStatus === "done" &&
                            item.extractedFields
                              ? "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--teal)]/50 hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                              : "cursor-not-allowed border-[var(--line)]/60 bg-[var(--mist)]/50 text-gray-300"
                          }`}
                          title={
                            item.extractStatus === "done"
                              ? "Ver dados extraídos"
                              : "Colete os dados antes de visualizar"
                          }
                          aria-label="Ver dados extraídos"
                        >
                          <ViewIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-md bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="extract-modal-title"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2
                  id="extract-modal-title"
                  className="font-display text-xl font-bold text-[var(--ink)]"
                >
                  {isComprovanteModal(modalItem)
                    ? "Dados do comprovante"
                    : "Dados da nota fiscal"}
                </h2>
                <p
                  className="mt-1 truncate text-xs text-[var(--ink-soft)]"
                  title={modalItem.file.name}
                >
                  {modalItem.file.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openFilePreview(modalItem.file)}
                  className="rounded-md border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:border-[var(--teal)]/50 hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  title="Visualizar arquivo"
                  aria-label="Visualizar arquivo"
                >
                  <FileIcon />
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md p-2 text-[var(--ink-soft)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="modal-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex w-full flex-col gap-5">
                {(isComprovanteModal(modalItem)
                  ? CP_SECTIONS
                  : NF_SECTIONS
                ).map((section) => {
                  const sectionFields = (modalItem.extractedFields || []).filter(
                    (field) =>
                      (section.keys as readonly string[]).includes(field.key) &&
                      field.value &&
                      field.value !== "Não encontrado"
                  );

                  if (sectionFields.length === 0) return null;

                  return (
                    <section key={section.id} className="w-full">
                      <h3 className="mb-2 font-display text-sm font-bold tracking-wide text-[var(--ink)]">
                        {section.title}
                      </h3>
                      <ul className="flex w-full flex-col gap-2">
                        {sectionFields.map((field) => {
                          const canCopy =
                            COPYABLE_FIELDS.has(field.key) &&
                            field.value &&
                            field.value !== "Não encontrado";

                          return (
                            <li
                              key={field.key}
                              className="w-full rounded-md border border-[var(--line)] bg-[var(--mist)]/60 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">
                                    {field.label}
                                  </p>
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium text-[var(--ink)]">
                                    {field.value}
                                  </p>
                                </div>
                                {canCopy && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyFieldValue(field.key, field.value)
                                    }
                                    className="mt-0.5 shrink-0 rounded-md border border-[var(--line)] bg-white p-2 text-[var(--ink-soft)] transition hover:border-[var(--teal)]/50 hover:text-[var(--ink)]"
                                    title={
                                      copiedKey === field.key
                                        ? "Copiado!"
                                        : `Copiar ${field.label}`
                                    }
                                    aria-label={`Copiar ${field.label}`}
                                  >
                                    {copiedKey === field.key ? (
                                      <span className="text-xs font-semibold text-[var(--teal)]">
                                        OK
                                      </span>
                                    ) : (
                                      <CopyIcon />
                                    )}
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}

                {(() => {
                  const sections = isComprovanteModal(modalItem)
                    ? CP_SECTIONS
                    : NF_SECTIONS;
                  const knownKeys = new Set<string>(
                    sections.flatMap((section) => [...section.keys])
                  );
                  const otherFields = (modalItem.extractedFields || []).filter(
                    (field) =>
                      !knownKeys.has(field.key) &&
                      field.value &&
                      field.value !== "Não encontrado"
                  );
                  if (otherFields.length === 0) return null;

                  return (
                    <section className="w-full">
                      <h3 className="mb-2 font-display text-sm font-bold tracking-wide text-[var(--ink)]">
                        Outros
                      </h3>
                      <ul className="flex w-full flex-col gap-2">
                        {otherFields.map((field) => (
                          <li
                            key={field.key}
                            className="w-full rounded-md border border-[var(--line)] bg-[var(--mist)]/60 p-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">
                              {field.label}
                            </p>
                            <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium text-[var(--ink)]">
                              {field.value}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })()}
              </div>

              {isNotaFiscal(modalItem) && podeValidar && (
                <button
                  type="button"
                  onClick={openValidacao}
                  className="mt-5 w-full rounded-md bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-soft)]"
                >
                  {usaPortalNacional
                    ? "Validar no portal nacional"
                    : "Validar no GISS"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ClassificarPage;
