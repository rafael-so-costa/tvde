import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  generateContractFieldMappings,
  renderContractContent,
} from "@/hooks/useContractFullData";
import { resolveSignatureImageUrl } from "@/utils/signatureImageUrls";

interface ExportContractPdfArgs {
  contractId: string;
  tenantId: string;
}

interface ProcessedContractDocument {
  html: string;
  title: string;
  fileName: string;
}

interface ProcessedHtmlArgs {
  html: string;
  title?: string;
  fileName?: string;
}

function escapeDocumentText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hasRenderableContractContent(html: string): boolean {
  const probe = document.createElement("div");
  probe.innerHTML = html || "";
  const text = (probe.textContent || "").replace(/\u00a0/g, " ").trim();
  return Boolean(text || probe.querySelector("img[src]"));
}

function assertRenderableContractContent(html: string): void {
  if (!hasRenderableContractContent(html)) {
    throw new Error("O contrato final está vazio após o processamento. Exportação bloqueada para evitar PDF/impressão em branco.");
  }
}

async function waitForStageRender(stage: HTMLElement): Promise<void> {
  const images = Array.from(stage.querySelectorAll("img")) as HTMLImageElement[];
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function loadProcessedContractDocument({ contractId, tenantId }: ExportContractPdfArgs): Promise<ProcessedContractDocument> {
  if (!contractId) throw new Error("Contrato inválido");
  if (!tenantId) throw new Error("Tenant não encontrado");

  const { data: contract, error } = await supabase
    .from("contratos")
    .select(
      `*,
       template:templates_contrato(*),
       motorista:motoristas(*),
       proprietario:proprietarios(*),
       veiculo:veiculos(*)`
    )
    .eq("id", contractId)
    .single();
  if (error || !contract) throw error || new Error("Contrato não encontrado");

  const templateContent: string = (contract as any).template?.conteudo_original || "";
  if (!templateContent.trim()) throw new Error("Este contrato não tem template para exportar.");

  const [{ data: empresa }, { data: signatureRows }] = await Promise.all([
    supabase.from("empresas").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase
      .from("assinaturas_digitais")
      .select("*")
      .eq("contrato_id", contractId)
      .order("created_at", { ascending: true }),
  ]);

  const fieldValues = generateContractFieldMappings({
    empresa,
    proprietario: (contract as any).proprietario,
    motorista: (contract as any).motorista,
    veiculo: (contract as any).veiculo,
    camposPreenchidos: (contract as any).campos_preenchidos as Record<string, any>,
  });

  const signatureValues: Record<string, string> = {};
  await Promise.all((signatureRows || []).map(async (s: any) => {
    const key = `ASSINATURA_${String(s.signatario_tipo || "").toUpperCase()}`;
    const url = await resolveSignatureImageUrl(s.assinatura_url);
    if (url) signatureValues[key] = url;
  }));

  const html = renderContractContent(templateContent, fieldValues, signatureValues, { cleanFinal: true });
  assertRenderableContractContent(html);

  const title = (contract as any).template?.nome || "Contrato";
  return {
    html,
    title,
    fileName: `${title}_${format(new Date(), "yyyy-MM-dd")}.pdf`,
  };
}

export async function exportProcessedContractHtmlToPdf({ html, title = "Contrato", fileName }: ProcessedHtmlArgs): Promise<void> {
  assertRenderableContractContent(html);

  const A4_W = 210;
  const A4_H = 297;
  const MARGIN_X = 15;
  const MARGIN_Y = 20;
  const CONTENT_W = A4_W - MARGIN_X * 2;
  const CONTENT_H = A4_H - MARGIN_Y * 2;
  const SECTION_GAP = 2;
  const PX_PER_MM = 96 / 25.4;
  const containerWidthPx = Math.round(CONTENT_W * PX_PER_MM);

  const stage = document.createElement("div");
  stage.style.position = "absolute";
  stage.style.left = "0";
  stage.style.top = "0";
  stage.style.zIndex = "-1";
  stage.style.width = `${containerWidthPx}px`;
  stage.style.background = "#ffffff";
  stage.style.color = "#000000";
  stage.style.fontFamily = "Georgia, 'Times New Roman', serif";
  stage.style.fontSize = "11pt";
  stage.style.lineHeight = "1.5";
  stage.style.whiteSpace = "pre-wrap";
  stage.style.pointerEvents = "none";
  stage.innerHTML = `<article class="contract-final-document" style="width:${containerWidthPx}px;white-space:pre-wrap;">${html}</article>`;
  stage.querySelectorAll("img").forEach((img) => {
    (img as HTMLImageElement).style.pageBreakInside = "avoid";
    (img as HTMLImageElement).style.breakInside = "avoid";
    (img as HTMLImageElement).style.maxWidth = "100%";
  });

  document.body.appendChild(stage);
  try {
    await waitForStageRender(stage);
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    const root = (stage.firstElementChild as HTMLElement) || stage;
    let blocks: HTMLElement[] = Array.from(root.children) as HTMLElement[];
    while (blocks.length === 1 && blocks[0].children.length > 1) {
      blocks = Array.from(blocks[0].children) as HTMLElement[];
    }
    if (blocks.length === 0) blocks = [root];

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let cursorY = MARGIN_Y;
    let isFirst = true;
    let renderedAnyBlock = false;

    for (const block of blocks) {
      if (!block.textContent?.trim() && block.querySelectorAll("img").length === 0) continue;

      const canvas = await html2canvas(block, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: Math.max(containerWidthPx, document.documentElement.clientWidth),
        windowHeight: Math.max(stage.scrollHeight + 40, window.innerHeight),
      });

      if (!canvas.width || !canvas.height) continue;
      const imgW = CONTENT_W;
      const imgH = (canvas.height * imgW) / canvas.width;
      const remaining = A4_H - MARGIN_Y - cursorY;

      if (!isFirst && imgH > remaining && cursorY > MARGIN_Y) {
        pdf.addPage();
        cursorY = MARGIN_Y;
      }

      if (imgH > CONTENT_H) {
        const pxPerMm = canvas.width / imgW;
        const pageHeightPx = Math.floor(CONTENT_H * pxPerMm);
        let offsetPx = 0;
        while (offsetPx < canvas.height) {
          const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetPx);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) break;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, -offsetPx);
          const sliceHmm = sliceHeight / pxPerMm;
          if (offsetPx > 0) {
            pdf.addPage();
            cursorY = MARGIN_Y;
          }
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", MARGIN_X, cursorY, imgW, sliceHmm);
          cursorY += sliceHmm + SECTION_GAP;
          offsetPx += sliceHeight;
          renderedAnyBlock = true;
        }
      } else {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN_X, cursorY, imgW, imgH);
        cursorY += imgH + SECTION_GAP;
        renderedAnyBlock = true;
      }

      isFirst = false;
    }

    if (!renderedAnyBlock) throw new Error("PDF não gerado: nenhum conteúdo renderizável foi encontrado.");
    pdf.save(fileName || `${title}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } finally {
    stage.remove();
  }
}

export function printProcessedContractHtml({ html, title = "Contrato" }: ProcessedHtmlArgs): void {
  assertRenderableContractContent(html);

  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("Popup bloqueado. Permita popups para imprimir o contrato.");

  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeDocumentText(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm 15mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #000; font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; }
    .contract-print-page { width: 180mm; min-height: 257mm; margin: 0 auto; white-space: pre-wrap; }
    p, div, section, article, table, tr, img, .signature-img { break-inside: avoid; page-break-inside: avoid; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <article class="contract-print-page">${html}</article>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); window.close(); }, 150);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Generates and triggers download of a contract PDF, end-to-end.
 * Used by the contracts list and by the editor dialog.
 */
export async function exportContractPdf({ contractId, tenantId }: ExportContractPdfArgs): Promise<void> {
  const documentData = await loadProcessedContractDocument({ contractId, tenantId });
  await exportProcessedContractHtmlToPdf(documentData);
}

export async function printContract({ contractId, tenantId }: ExportContractPdfArgs): Promise<void> {
  const documentData = await loadProcessedContractDocument({ contractId, tenantId });
  printProcessedContractHtml(documentData);
}
