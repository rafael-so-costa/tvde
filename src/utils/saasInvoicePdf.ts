import jsPDF from "jspdf";
import type { SaasConfigFaturacao, SaasFatura } from "@/hooks/useSaas";

const euro = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v || 0);

const dataPt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-PT") : "—");

/** Gera e descarrega o PDF da fatura emitida ao cliente do SaaS. */
export function exportarFaturaPdf(fatura: SaasFatura, cfg: SaasConfigFaturacao | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 60;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(cfg?.emitente_nome || "Fatura", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 18;
  const emitenteLinhas = [
    cfg?.emitente_nif ? `NIF: ${cfg.emitente_nif}` : null,
    cfg?.emitente_endereco,
    [cfg?.emitente_email, cfg?.emitente_telefone].filter(Boolean).join(" · ") || null,
  ].filter(Boolean) as string[];
  emitenteLinhas.forEach((linha) => {
    doc.text(linha, marginX, y);
    y += 14;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`FATURA ${fatura.numero}`, 547, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Data de emissão: ${dataPt(fatura.data_emissao)}`, 547, 78, { align: "right" });
  doc.text(`Vencimento: ${dataPt(fatura.data_vencimento)}`, 547, 92, { align: "right" });
  doc.text(`Estado: ${fatura.estado}`, 547, 106, { align: "right" });

  y = Math.max(y, 130);
  doc.setDrawColor(220);
  doc.line(marginX, y, 547, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.text("Cliente", marginX, y);
  doc.setFont("helvetica", "normal");
  y += 16;
  [
    fatura.cliente_nome,
    fatura.cliente_nif ? `NIF: ${fatura.cliente_nif}` : null,
    fatura.cliente_endereco,
    fatura.cliente_email,
  ]
    .filter(Boolean)
    .forEach((linha) => {
      doc.text(String(linha), marginX, y);
      y += 14;
    });

  y += 18;
  doc.setFillColor(245, 245, 247);
  doc.rect(marginX, y - 14, 547 - marginX, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Descrição", marginX + 8, y);
  doc.text("Valor", 539, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 26;

  const descricao = fatura.descricao || "Subscrição do serviço";
  const periodo =
    fatura.periodo_inicio || fatura.periodo_fim
      ? `Período: ${dataPt(fatura.periodo_inicio)} a ${dataPt(fatura.periodo_fim)}`
      : null;
  const linhasDescricao = doc.splitTextToSize(descricao, 340) as string[];
  linhasDescricao.forEach((linha, idx) => {
    doc.text(linha, marginX + 8, y + idx * 14);
  });
  doc.text(euro(Number(fatura.subtotal)), 539, y, { align: "right" });
  y += linhasDescricao.length * 14 + 4;
  if (periodo) {
    doc.setTextColor(120);
    doc.text(periodo, marginX + 8, y);
    doc.setTextColor(0);
    y += 18;
  }

  y += 16;
  doc.line(320, y, 547, y);
  y += 18;
  const totais: [string, string][] = [
    ["Subtotal", euro(Number(fatura.subtotal))],
    [`IVA (${Number(fatura.taxa_iva)}%)`, euro(Number(fatura.valor_iva))],
  ];
  totais.forEach(([label, valor]) => {
    doc.text(label, 380, y);
    doc.text(valor, 539, y, { align: "right" });
    y += 16;
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 380, y + 4);
  doc.text(euro(Number(fatura.total)), 539, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 40;

  if (cfg?.iban) {
    doc.text(`Pagamento por transferência — IBAN: ${cfg.iban}`, marginX, y);
    y += 16;
  }
  if (fatura.referencia_externa) {
    doc.text(`Referência: ${fatura.referencia_externa}`, marginX, y);
    y += 16;
  }
  if (fatura.notas) {
    const notas = doc.splitTextToSize(fatura.notas, 500) as string[];
    notas.forEach((linha) => {
      doc.text(linha, marginX, y);
      y += 14;
    });
  }

  if (cfg?.rodape) {
    doc.setTextColor(130);
    doc.setFontSize(9);
    const rodape = doc.splitTextToSize(cfg.rodape, 500) as string[];
    rodape.forEach((linha, idx) => {
      doc.text(linha, marginX, 790 + idx * 12);
    });
  }

  doc.save(`${fatura.numero}.pdf`);
}
