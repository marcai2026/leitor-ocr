import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const endpoint = (process.env.AZURE_ENDPOINT || "").replace(/\/$/, "");
    const apiKey = process.env.AZURE_API_KEY || "";
    const modelId = "cnh";
    const url = `${endpoint}/documentintelligence/documentModels/${modelId}:analyze?api-version=2024-11-30`;

    const results = [];

    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();

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
          response.headers.get("Operation-Location") || response.headers.get("operation-location");

        if (operationLocation) {
          const analysisResults = await pollForAnalysisResults(operationLocation, apiKey);
          results.push(analysisResults);
        } else {
          return NextResponse.json({ error: "Operation-Location não encontrado" }, { status: 500 });
        }
      } else {
        const errorData = await response.json().catch(() => null);
        results.push({ error: "Erro na requisição de análise", details: errorData });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Erro no servidor:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
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
      return { error: "Erro ao verificar o status da análise", status: response.status };
    }

    const data = await response.json();
    const status = String(data.status || "").toLowerCase();

    if (status === "succeeded") {
      return data.analyzeResult;
    }

    if (status === "failed") {
      return { error: "Análise falhou", details: data };
    }
  }

  return { error: "Timeout ao aguardar análise" };
}
