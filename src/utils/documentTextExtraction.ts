// Extração de texto no browser: PDF nativo (pdfjs) com fallback OCR (tesseract.js).
// Tudo é carregado dinamicamente para não pesar no arranque da aplicação.

import { faltamCamposEssenciais } from "./criminalRecordParser";

export type ExtractionProgress = (info: { etapa: string; percent: number }) => void;

const MIN_TEXT_LENGTH = 120;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;
  return pdfjs;
}

async function extractPdfText(file: File, onProgress?: ExtractionProgress) {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = Math.min(doc.numPages, 10);
  let text = "";
  for (let i = 1; i <= pages; i++) {
    onProgress?.({ etapa: `A ler página ${i} de ${pages}`, percent: (i / pages) * 60 });
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Agrupa os fragmentos por linha (posição vertical) para manter a estrutura
    // do documento — indispensável para ler tabelas de valores e etiquetas.
    const linhas: { y: number; partes: { x: number; str: string }[] }[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const fragmento = item as { str: string; transform?: number[] };
      if (!fragmento.str) continue;
      const x = fragmento.transform?.[4] ?? 0;
      const y = fragmento.transform?.[5] ?? 0;
      const linha = linhas.find((l) => Math.abs(l.y - y) <= 2.5);
      if (linha) linha.partes.push({ x, str: fragmento.str });
      else linhas.push({ y, partes: [{ x, str: fragmento.str }] });
    }

    text += linhas
      .sort((a, b) => b.y - a.y)
      .map((linha) =>
        linha.partes
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s{2,}/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .join("\n") + "\n";
  }
  return { text, doc, pages };
}

async function renderPdfPagesToImages(
  doc: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]>,
  pages: number,
): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= Math.min(pages, 3); i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvas, canvasContext: context, viewport } as never).promise;
    canvases.push(canvas);
  }
  return canvases;
}

async function ocrImages(
  sources: (HTMLCanvasElement | File)[],
  onProgress?: ExtractionProgress,
) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por");
  try {
    let text = "";
    for (let i = 0; i < sources.length; i++) {
      onProgress?.({
        etapa: `A reconhecer texto (${i + 1}/${sources.length})`,
        percent: 60 + ((i + 1) / sources.length) * 35,
      });
      const { data } = await worker.recognize(sources[i]);
      text += data.text + "\n";
    }
    return text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Extrai texto de um PDF ou imagem, usando OCR quando o ficheiro não tem texto digital.
 * `precisaOcr` permite a cada tipo de documento decidir se o texto lido é suficiente.
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: ExtractionProgress,
  precisaOcr: (text: string) => boolean = faltamCamposEssenciais,
): Promise<{ text: string; origem: "pdf" | "ocr" }> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  if (isPdf) {
    const { text, doc, pages } = await extractPdfText(file, onProgress);
    const temTexto = text.replace(/\s/g, "").length >= MIN_TEXT_LENGTH;
    // Certidões digitalizadas trazem apenas o rodapé em texto: se faltarem os campos
    // essenciais, recorremos ao OCR mesmo havendo camada de texto.
    if (temTexto && !precisaOcr(text)) {
      onProgress?.({ etapa: "Leitura concluída", percent: 100 });
      return { text, origem: "pdf" };
    }
    onProgress?.({ etapa: "Documento digitalizado — a reconhecer texto", percent: 60 });
    const canvases = await renderPdfPagesToImages(doc, pages);
    const ocrText = await ocrImages(canvases, onProgress);
    onProgress?.({ etapa: "Leitura concluída", percent: 100 });
    return { text: text + "\n" + ocrText, origem: "ocr" };
  }

  onProgress?.({ etapa: "A reconhecer texto da imagem", percent: 20 });
  const ocrText = await ocrImages([file], onProgress);
  onProgress?.({ etapa: "Leitura concluída", percent: 100 });
  return { text: ocrText, origem: "ocr" };
}
