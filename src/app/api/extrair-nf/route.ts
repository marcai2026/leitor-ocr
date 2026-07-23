import { NextResponse } from "next/server";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const FIELD_LABELS: Record<string, string> = {
  numero: "Número",
  codigo_verificacao: "Código de verificação",
  chave_acesso: "Chave de acesso",
  data_emissao: "Data de emissão",
  prestador_nome: "Prestador (nome)",
  prestador_cnpj: "Prestador (CNPJ)",
  tomador_nome: "Tomador (nome)",
  tomador_cpf_cnpj: "Tomador (CPF/CNPJ)",
  discriminacao: "Discriminação",
  valor_servico: "Valor do serviço",
  valor_liquido: "Valor líquido",
  competencia: "Competência",
};

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return [...ALLOWED_EXTENSIONS].some((ext) => name.endsWith(ext));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use PDF, JPG, JPEG ou PNG." },
        { status: 400 }
      );
    }

    const endpoint = (process.env.AZURE_ENDPOINT || "").replace(/\/$/, "");
    const apiKey = process.env.AZURE_API_KEY || "";
    const modelId = "ext-nf-v1";
    const url = `${endpoint}/documentintelligence/documentModels/${modelId}:analyze?api-version=2024-11-30`;

    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(fileBuffer) as BodyInit,
    });

    if (response.status === 202) {
      const operationLocation =
        response.headers.get("Operation-Location") ||
        response.headers.get("operation-location");

      if (!operationLocation) {
        return NextResponse.json(
          { error: "Operation-Location não encontrado" },
          { status: 500 }
        );
      }

      const analyzeResult = await pollForAnalysisResults(operationLocation, apiKey);

      if (analyzeResult?.error) {
        return NextResponse.json(
          {
            error: analyzeResult.error,
            details: analyzeResult.details ?? null,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        fileName: file.name,
        modelId,
        fields: parseNfFields(analyzeResult),
        availableFieldKeys: Object.keys(
          analyzeResult?.documents?.[0]?.fields || {}
        ),
      });
    }

    const errorData = await response.json().catch(() => null);
    return NextResponse.json(
      {
        error: `Erro na análise (HTTP ${response.status})`,
        details: errorData,
      },
      { status: response.status >= 400 ? response.status : 500 }
    );
  } catch (error) {
    console.error("Erro ao extrair NF:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

function readFieldValue(field: any): string {
  if (!field) return "Não encontrado";

  if (typeof field.valueString === "string" && field.valueString.trim()) {
    return field.valueString.trim();
  }
  if (typeof field.content === "string" && field.content.trim()) {
    return field.content.trim();
  }
  if (typeof field.valueDate === "string" && field.valueDate.trim()) {
    return field.valueDate.trim();
  }
  if (typeof field.valueTime === "string" && field.valueTime.trim()) {
    return field.valueTime.trim();
  }
  if (typeof field.valueNumber === "number" && Number.isFinite(field.valueNumber)) {
    return formatNumber(field.valueNumber);
  }
  if (typeof field.valueDouble === "number" && Number.isFinite(field.valueDouble)) {
    return formatNumber(field.valueDouble);
  }
  if (typeof field.valueInteger === "number" && Number.isFinite(field.valueInteger)) {
    return String(field.valueInteger);
  }
  if (field.valueCurrency?.amount != null && Number.isFinite(Number(field.valueCurrency.amount))) {
    return formatNumber(Number(field.valueCurrency.amount));
  }
  // Alguns retornos trazem value como string/number direto
  if (typeof field.value === "string" && field.value.trim()) {
    return field.value.trim();
  }
  if (typeof field.value === "number" && Number.isFinite(field.value)) {
    return formatNumber(field.value);
  }

  return "Não encontrado";
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[\s-]+/g, "_");
}

function findField(fields: Record<string, any>, key: string) {
  if (fields[key]) return fields[key];

  const target = normalizeKey(key);
  const match = Object.keys(fields).find((candidate) => normalizeKey(candidate) === target);
  return match ? fields[match] : undefined;
}

function parseNfFields(analyzeResult: any) {
  const fields = analyzeResult?.documents?.[0]?.fields || {};
  const orderedKeys = Object.keys(FIELD_LABELS);

  const knownNormalized = new Set(orderedKeys.map(normalizeKey));
  const extraKeys = Object.keys(fields).filter(
    (key) => !knownNormalized.has(normalizeKey(key))
  );
  const allKeys = [...orderedKeys, ...extraKeys];

  return allKeys.map((key) => {
    const field = findField(fields, key);
    return {
      key,
      label: FIELD_LABELS[key] || formatLabel(key),
      value: readFieldValue(field),
      confidence: typeof field?.confidence === "number" ? field.confidence : null,
      type: field?.type || field?.fieldType || null,
    };
  });
}

function formatLabel(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
