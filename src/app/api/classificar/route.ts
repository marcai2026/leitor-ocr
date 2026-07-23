import { NextResponse } from "next/server";

const CONFIDENCE_THRESHOLD = 0.7;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return [...ALLOWED_EXTENSIONS].some((ext) => name.endsWith(ext));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (files.length > 1) {
      return NextResponse.json(
        { error: "Envie apenas 1 arquivo por vez." },
        { status: 400 }
      );
    }

    const invalid = files.filter((file) => !isAllowedFile(file));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: "Tipos de arquivo não permitidos. Use apenas PDF, JPG, JPEG ou PNG.",
          invalidFiles: invalid.map((file) => file.name),
        },
        { status: 400 }
      );
    }

    const endpoint = (process.env.AZURE_ENDPOINT || "").replace(/\/$/, "");
    const apiKey = process.env.AZURE_API_KEY || "";
    const modelId = "classification-doc-v3";
    const url = `${endpoint}/documentintelligence/documentClassifiers/${modelId}:analyze?api-version=2024-11-30&split=none`;

    const results = [];

    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer();

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
            // Mesmo padrão da rota CNH — funciona melhor com PDF/imagem
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(fileBuffer) as BodyInit,
        });

        if (response.status === 202) {
          const operationLocation =
            response.headers.get("Operation-Location") ||
            response.headers.get("operation-location");

          if (!operationLocation) {
            results.push(invalidResult(file.name, "Operation-Location não encontrado"));
            continue;
          }

          const analysisResults = await pollForAnalysisResults(
            operationLocation,
            apiKey
          );
          const normalized = normalizeClassification(analysisResults);
          console.log("[classificar]", file.name, normalized);
          results.push({ fileName: file.name, ...normalized });
          continue;
        }

        if (response.ok) {
          const data = await response.json().catch(() => null);
          const normalized = normalizeClassification(data?.analyzeResult ?? data);
          console.log("[classificar]", file.name, normalized);
          results.push({ fileName: file.name, ...normalized });
          continue;
        }

        const errorData = await response.json().catch(() => null);
        console.error("[classificar] HTTP error", file.name, response.status, errorData);
        results.push(
          invalidResult(
            file.name,
            `Erro na análise (HTTP ${response.status})`,
            errorData
          )
        );
      } catch (fileError) {
        console.error("[classificar] file error", file.name, fileError);
        results.push(
          invalidResult(
            file.name,
            fileError instanceof Error ? fileError.message : "Erro ao processar arquivo"
          )
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Erro no servidor:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

function invalidResult(fileName: string, error: string, details?: unknown) {
  return {
    fileName,
    tipo: "invalido",
    label: "Inválido",
    confidence: 0,
    valido: false,
    error,
    details: details ?? null,
  };
}

function formatLabel(docType: string) {
  const normalized = docType.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "recibo") return "Recibo de comprovante";

  return docType
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function toConfidence(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Se vier 0–100 por engano, normaliza para 0–1
  if (n > 1 && n <= 100) return n / 100;
  return n;
}

function normalizeClassification(analysisResults: any) {
  if (!analysisResults) {
    return {
      tipo: "invalido",
      label: "Inválido",
      confidence: 0,
      valido: false,
      error: "Resultado vazio da análise",
    };
  }

  // Erro nosso do poll — não confundir com analyzeResult
  if (analysisResults.error && !analysisResults.documents && !analysisResults.analyzeResult) {
    return {
      tipo: "invalido",
      label: "Inválido",
      confidence: 0,
      valido: false,
      error: String(analysisResults.error),
      details: analysisResults.details ?? null,
    };
  }

  const payload = analysisResults.analyzeResult ?? analysisResults;
  const documents = Array.isArray(payload?.documents) ? payload.documents : [];

  if (documents.length === 0) {
    return {
      tipo: "invalido",
      label: "Inválido",
      confidence: 0,
      valido: false,
      error: "Nenhum documento classificado no retorno do Azure",
    };
  }

  // Pega a classificação com maior confiança
  const document = documents.reduce((best: any, current: any) => {
    return toConfidence(current?.confidence) > toConfidence(best?.confidence)
      ? current
      : best;
  }, documents[0]);

  const confidence = toConfidence(document?.confidence);
  const docType = typeof document?.docType === "string" ? document.docType.trim() : "";

  if (!docType) {
    return {
      tipo: "invalido",
      label: "Inválido",
      confidence,
      valido: false,
      error: "docType ausente no retorno",
    };
  }

  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      tipo: "invalido",
      label: "Inválido",
      confidence,
      valido: false,
      docType,
    };
  }

  return {
    tipo: docType,
    label: formatLabel(docType),
    confidence,
    valido: true,
    docType,
  };
}

async function pollForAnalysisResults(operationLocation: string, apiKey: string) {
  const maxAttempts = 60;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 800 : 1500));

    const response = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!response.ok) {
      return {
        error: "Erro ao verificar o status da análise",
        details: { status: response.status },
      };
    }

    const data = await response.json();
    const status = String(data.status || "").toLowerCase();

    if (status === "succeeded") {
      return data.analyzeResult ?? data;
    }

    if (status === "failed") {
      return { error: "Análise falhou", details: data };
    }
  }

  return { error: "Timeout ao aguardar análise" };
}
