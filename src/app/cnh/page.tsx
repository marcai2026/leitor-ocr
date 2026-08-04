"use client";

import { useState } from "react";
import { apiRoutes } from "@/lib/api";

const CnhPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<Record<string, string>[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const validFiles = Array.from(selectedFiles).filter(
        (file) =>
          file.type === "application/pdf" || file.type.startsWith("image/")
      );
      if (validFiles.length > 0) {
        setFiles(validFiles);
        setExtractedData([]);
        setError(null);
      } else {
        setFiles([]);
        setError("Selecione arquivos PDF ou imagem (.png, .jpeg).");
      }
    }
  };

  const handleUpload = async () => {
    setExtractedData([]);
    if (files.length === 0) {
      setError("Nenhum arquivo selecionado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(apiRoutes.extractCnh(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao processar os documentos.");
      }

      const data = await response.json();

      setExtractedData(parseExtractedData(data));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao enviar os arquivos."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (file: File) => {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");
  };

  const parseExtractedData = (data: any) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [{ Mensagem: "Nenhum dado extraído." }];
    }

    return data.flatMap((file: any) => {
      if (!file?.documents?.length) {
        return [{ Mensagem: "Nenhum dado extraído neste arquivo." }];
      }

      return file.documents.map((doc: any) => {
        const fields = doc.fields || {};

        const cleanValue = (value: string | undefined) => {
          if (!value) return "Não encontrado";

          const cleaned = value
            .replace(
              /(2 e 1|NOME E SOBRENOME|NOME|CPF|4d CPF|DATA NASCIMENTO|DATA EMISSÃO|4a DATA EMISSÃO|1º HABILITAÇÃO|1ª HABILITAÇÃO|VALIDADE|4b VALIDADE|5 N° REGISTRO|5 REGISTRO|Nº REGISTRO|S Nº REGISTRO| 5 Nº REGISTRO|DOC\.IDENTIDADE|3 DATA, LOCAL E UF DE NASCIMENTO|ORG\.EMISSOR|4c DOC\. IDENTIDADE \/ ORG\. EMISSOR \/ UF|4c DOC IDENTIDADE \/ ÓRG EMISSOR \/ UF| 4c DOC\. IDENTIDADE \/ ÓRG\. EMISSOR \/ UF|4€ DOC IDENTIDADE \/ ÓRG EMISSOR \/ UF|FILIAÇÃO)[^A-Za-z0-9]*/gi,
              ""
            )
            .trim();

          return cleaned || "Não encontrado";
        };

        return {
          Nome: cleanValue(fields["Nome e Sobrenome"]?.valueString),
          CPF: cleanValue(fields["CPF"]?.valueString),
          "Data de Nascimento": cleanValue(fields["Nascimento"]?.valueString),
          "Data de Emissão": cleanValue(fields["Data de Emissão"]?.valueString),
          "Primeira Habilitação": cleanValue(
            fields["Primeira Habilitação"]?.valueString
          ),
          Validade: cleanValue(fields["Validade"]?.valueString),
          Registro: cleanValue(fields["Registro"]?.valueString),
          "Documento de Identidade": cleanValue(
            fields["Doc identidade"]?.valueString
          ),
          Filiação: cleanValue(fields["Filiação"]?.valueString),
        };
      });
    });
  };

  return (
    <main className="site-grid min-h-full overflow-y-auto px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--teal)]">
            Extração
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-[var(--ink)]">
            Extrair CNH
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Envie PDF ou imagem da carteira para ler os campos com o modelo{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-[var(--ink)]">
              cnh
            </code>
            .
          </p>
        </div>

        <div className="rounded-md border border-[var(--line)] bg-white/80 p-4">
          <input
            type="file"
            accept=".pdf,.png,.jpeg,.jpg"
            multiple
            onChange={handleFileChange}
            className="w-full rounded-md border border-[var(--line)] bg-white p-2"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className={`mt-4 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition ${
              loading
                ? "cursor-not-allowed bg-gray-400"
                : "bg-[var(--ink)] hover:bg-[var(--ink-soft)]"
            }`}
          >
            {loading ? "Processando..." : "Extrair dados"}
          </button>
        </div>

        {files.length > 0 && (
          <div className="rounded-md border border-[var(--line)] bg-white/70 p-4">
            <h2 className="font-semibold text-[var(--ink)]">
              Arquivos selecionados
            </h2>
            <ul className="mt-2 space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    onClick={() => handlePreview(file)}
                    className="shrink-0 text-[var(--teal)] underline"
                  >
                    Visualizar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-100 p-4 text-red-800">{error}</div>
        )}

        {extractedData.length > 0 && (
          <div className="space-y-4">
            {extractedData.map((data, index) => {
              const isExpired =
                data.Validade && data.Validade !== "Não encontrado"
                  ? new Date(data.Validade.split("/").reverse().join("-")) <
                    new Date()
                  : null;

              return (
                <div
                  key={index}
                  className="rounded-md border border-[var(--line)] bg-white/90 p-4"
                >
                  <div className="mb-4 flex w-full items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-[var(--ink)]">
                      Documento {index + 1}
                    </h2>
                    <div
                      className={`w-fit px-3 py-1.5 text-sm font-bold text-white ${
                        isExpired ? "bg-red-600" : "bg-emerald-700"
                      }`}
                    >
                      {isExpired ? "Vencido" : "Válido"}
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-[var(--ink-soft)]">
                    {Object.entries(data).map(([key, value]) => (
                      <li key={key}>
                        <strong className="text-[var(--ink)]">{key}:</strong>{" "}
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default CnhPage;
