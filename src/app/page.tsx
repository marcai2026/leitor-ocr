"use client";

import { useState } from "react";

const Home = () => {
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

      const response = await fetch("/api/cnh", {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Upload de Arquivos</h1>

      <input
        type="file"
        accept=".pdf,.png,.jpeg,.jpg"
        multiple
        onChange={handleFileChange}
        className="border p-2 rounded-md bg-white shadow-md"
      />

      {files.length > 0 && (
        <div className="mt-2">
          <h2 className="font-bold">Arquivos Selecionados:</h2>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="text-sm text-gray-700">
                {file.name}{" "}
                <button
                  onClick={() => handlePreview(file)}
                  className="text-blue-500 underline ml-2"
                >
                  Visualizar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading}
        className={`mt-4 px-4 py-2 rounded-md shadow-md text-white ${
          loading
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Processando..." : "Extrair Dados"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {extractedData.length > 0 && (
        <div className="mt-4 space-y-6 w-full max-w-2xl">
          {extractedData.map((data, index) => {
            const isExpired =
              data.Validade && data.Validade !== "Não encontrado"
                ? new Date(data.Validade.split("/").reverse().join("-")) <
                  new Date()
                : null;

            return (
              <div
                key={index}
                className="p-4 bg-white shadow-md rounded-md w-full"
              >
                <div className="w-full flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Documento {index + 1}</h2>
                  <div
                    className={`w-fit font-bold px-4 py-2 rounded-sm text-white ${
                      isExpired ? "bg-red-600" : "bg-green-600"
                    }`}
                  >
                    {isExpired ? "Vencido" : "Válido"}
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-2">
                  {Object.entries(data).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;
