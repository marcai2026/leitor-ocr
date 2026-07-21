import { NextResponse } from "next/server";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const FIELD_LABELS: Record<string, string> = {
  valor: "Valor",
  data_hora_transacao: "Data/hora da transação",
  data_transacao: "Data da transação",
  hora_transacao: "Hora da transação",
  id_transacao: "ID da transação",
  tipo_pagamento: "Tipo de pagamento",
  forma_pagamento: "Forma de pagamento",
  banco_emissor: "Banco emissor",
  codigo_autenticacao: "Código de autenticação",
  pagador_nome: "Nome",
  pagador_cpf: "CPF",
  pagador_agencia: "Agência",
  pagador_conta: "Conta",
  pagador_agencia_conta: "Agência/conta",
  recebedor_nome: "Nome",
  recebedor_cpf_cnpj: "CPF/CNPJ",
  recebedor_instituicao: "Instituição",
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
    const modelId = "ext-cp-v1";
    const url = `${endpoint}/documentintelligence/documentModels/${modelId}:analyze?api-version=2024-11-30`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
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

      const fields = parseCpFields(analyzeResult);
      const validation = validateComprovante(fields);

      return NextResponse.json({
        fileName: file.name,
        modelId,
        fields,
        availableFieldKeys: Object.keys(
          analyzeResult?.documents?.[0]?.fields || {}
        ),
        valido: validation.valido,
        motivoInvalido: validation.motivoInvalido,
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
    console.error("Erro ao extrair comprovante:", error);
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
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Aliases: nome canônico → possíveis nomes retornados pelo Azure */
const FIELD_ALIASES: Record<string, string[]> = {
  data_hora_transacao: [
    "data_hora_transacao",
    "data_hora",
    "realizado_em",
    "data_e_hora",
  ],
  data_transacao: ["data_transacao", "data"],
  hora_transacao: ["hora_transacao", "hora"],
  forma_pagamento: ["forma_pagamento", "forma"],
  pagador_agencia_conta: [
    "pagador_agencia_conta",
    "cooperativa_e_conta_origem",
    "agencia_conta",
    "agencia_e_conta",
  ],
  pagador_agencia: ["pagador_agencia", "agencia"],
  pagador_conta: ["pagador_conta", "conta"],
  recebedor_nome: [
    "recebedor_nome",
    "destinatario_nome",
    "nome_do_destinatario",
  ],
  recebedor_cpf_cnpj: [
    "recebedor_cpf_cnpj",
    "cnpj_do_destinatario",
    "destinatario_cnpj",
  ],
  recebedor_instituicao: [
    "recebedor_instituicao",
    "instituicao_do_destinatario",
  ],
};

function findFieldKey(fields: Record<string, any>, key: string) {
  if (fields[key]) return key;

  const aliases = FIELD_ALIASES[key] || [key];
  const targets = new Set(aliases.map(normalizeKey));
  targets.add(normalizeKey(key));

  return Object.keys(fields).find((candidate) =>
    targets.has(normalizeKey(candidate))
  );
}

function findField(fields: Record<string, any>, key: string) {
  const match = findFieldKey(fields, key);
  return match ? fields[match] : undefined;
}

function isMissing(value: string) {
  return !value || value === "Não encontrado";
}

function splitDateTime(value: string): { data?: string; hora?: string } {
  const cleaned = value.trim();
  // 18/07/2026 - 03:32:24 | 18/07/2026 às 03:32:24 | 18/07/2026 03:32:24
  const match = cleaned.match(
    /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:[-–—]|às|as)?\s*(\d{1,2}[:.hH]\d{2}(?::\d{2})?)/i
  );
  if (!match) return {};
  return {
    data: match[1],
    hora: match[2].replace(/[hH.]/g, ":"),
  };
}

function splitAgenciaConta(value: string): {
  agencia?: string;
  conta?: string;
} {
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d+)\s*\/\s*([\d.-]+)$/);
  if (!match) return {};
  return { agencia: match[1], conta: match[2] };
}

function inferFormaPagamento(
  tipo: string,
  forma: string
): string | undefined {
  if (!isMissing(forma)) return undefined;
  const text = tipo.toLowerCase();
  if (text.includes("pix")) return "Pix";
  if (text.includes("boleto")) return "Boleto";
  if (text.includes("ted") || text.includes("transfer")) return "Transferência";
  if (text.includes("cartao") || text.includes("crédito") || text.includes("credito"))
    return "Cartão";
  return undefined;
}

function parseCpFields(analyzeResult: any) {
  const fields = analyzeResult?.documents?.[0]?.fields || {};
  const orderedKeys = Object.keys(FIELD_LABELS);

  const matchedAzureKeys = new Set<string>();
  const parsed = orderedKeys.map((key) => {
    const azureKey = findFieldKey(fields, key);
    if (azureKey) matchedAzureKeys.add(azureKey);

    const field = azureKey ? fields[azureKey] : undefined;
    return {
      key,
      label: FIELD_LABELS[key],
      value: readFieldValue(field),
      confidence: typeof field?.confidence === "number" ? field.confidence : null,
      type: field?.type || field?.fieldType || null,
    };
  });

  const byKey = Object.fromEntries(parsed.map((field) => [field.key, field]));

  // Limpa espaços estranhos do CPF mascarado (ex.: ***. 695.224 -**)
  if (!isMissing(byKey.pagador_cpf.value)) {
    byKey.pagador_cpf.value = byKey.pagador_cpf.value
      .replace(/\s+/g, "")
      .replace(/-(?=\*+$)/, "-");
  }

  // Data/hora combinada → preencher campos separados
  if (!isMissing(byKey.data_hora_transacao.value)) {
    const { data, hora } = splitDateTime(byKey.data_hora_transacao.value);
    if (data && isMissing(byKey.data_transacao.value)) {
      byKey.data_transacao.value = data;
    }
    if (hora && isMissing(byKey.hora_transacao.value)) {
      byKey.hora_transacao.value = hora;
    }
  }

  // Agência/conta juntas em um único campo (ex.: 2205/75253-3)
  const combined =
    (!isMissing(byKey.pagador_agencia_conta.value)
      ? byKey.pagador_agencia_conta.value
      : null) ||
    (!isMissing(byKey.pagador_conta.value) &&
    byKey.pagador_conta.value.includes("/")
      ? byKey.pagador_conta.value
      : null) ||
    (!isMissing(byKey.pagador_agencia.value) &&
    byKey.pagador_agencia.value.includes("/")
      ? byKey.pagador_agencia.value
      : null);

  if (combined) {
    if (isMissing(byKey.pagador_agencia_conta.value)) {
      byKey.pagador_agencia_conta.value = combined;
    }
    const { agencia, conta } = splitAgenciaConta(combined);
    if (agencia && (isMissing(byKey.pagador_agencia.value) || byKey.pagador_agencia.value.includes("/"))) {
      byKey.pagador_agencia.value = agencia;
    }
    if (conta && (isMissing(byKey.pagador_conta.value) || byKey.pagador_conta.value.includes("/"))) {
      byKey.pagador_conta.value = conta;
    }
  }

  // Inferir forma de pagamento a partir do tipo (ex.: "Comprovante de Pagamento Pix")
  const inferredForma = inferFormaPagamento(
    byKey.tipo_pagamento.value,
    byKey.forma_pagamento.value
  );
  if (inferredForma) {
    byKey.forma_pagamento.value = inferredForma;
  }

  const extraKeys = Object.keys(fields).filter((key) => {
    if (matchedAzureKeys.has(key)) return false;
    // Também esconde extras que já casaram por alias
    return !orderedKeys.some((canonical) => findFieldKey({ [key]: true }, canonical) === key);
  });

  const extras = extraKeys.map((key) => {
    const field = fields[key];
    return {
      key,
      label: FIELD_LABELS[key] || formatLabel(key),
      value: readFieldValue(field),
      confidence: typeof field?.confidence === "number" ? field.confidence : null,
      type: field?.type || field?.fieldType || null,
    };
  });

  return [...parsed, ...extras];
}

function fieldValue(
  fields: { key: string; value: string }[],
  key: string
) {
  const field = fields.find((entry) => entry.key === key);
  if (!field || field.value === "Não encontrado") return "";
  return field.value.trim();
}

/**
 * Valida comprovante: rejeita se não tiver pagador.
 */
function validateComprovante(fields: { key: string; value: string }[]) {
  const pagador = fieldValue(fields, "pagador_nome");

  if (!pagador) {
    return {
      valido: false,
      motivoInvalido: "Comprovante sem pagador.",
    };
  }

  return { valido: true, motivoInvalido: null };
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
