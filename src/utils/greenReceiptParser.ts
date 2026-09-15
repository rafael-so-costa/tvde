// Leitura dos dados de uma fatura-recibo (recibo verde) emitida no Portal das Finanças.
// Todo o processamento corre no browser, a partir do texto extraído do PDF ou por OCR.

export interface GreenReceiptExtraction {
  numeroDocumento: string | null;
  dataEmissao: string | null; // yyyy-mm-dd
  nifEmitente: string | null;
  nomeEmitente: string | null;
  nifAdquirente: string | null;
  nomeAdquirente: string | null;
  valorBase: number | null;
  valorIva: number | null;
  retencaoIrs: number | null;
  valorTotal: number | null;
  confianca: "alta" | "media" | "baixa";
  origem: "pdf" | "ocr";
  texto: string;
}

function normalizar(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "");
}

/** Converte "1.234,56" ou "1234.56" em número. */
function paraNumero(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const limpo = raw.replace(/[^\d.,-]/g, "").trim();
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  }
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Converte datas dd-mm-yyyy, dd/mm/yyyy ou yyyy-mm-dd para yyyy-mm-dd. */
function paraDataISO(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  let m = t.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function primeiroGrupo(text: string, padroes: RegExp[]): string | null {
  for (const padrao of padroes) {
    const m = text.match(padrao);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

const NIF = "(\\d{9})";

/** Devolve o bloco de texto de uma secção da fatura-recibo do Portal das Finanças. */
function bloco(text: string, inicio: RegExp, tamanho = 400): string {
  const m = text.match(inicio);
  if (!m || m.index === undefined) return "";
  return text.slice(m.index, m.index + tamanho);
}

/** Lê "NOME XPTO LDA" dentro de um bloco (a etiqueta e o valor ficam na mesma linha). */
function nomeDoBloco(blocoTexto: string): string | null {
  const m = blocoTexto.match(/\bNOME[:\s]+([^\n]{3,90})/i);
  if (!m) return null;
  const valor = m[1].replace(/\s{2,}/g, " ").trim();
  return valor || null;
}

export function parseGreenReceiptText(
  rawText: string,
  origem: "pdf" | "ocr" = "pdf",
): GreenReceiptExtraction {
  const text = normalizar(rawText);

  const blocoTransmitente = bloco(
    text,
    /DADOS\s+DO\s+(?:TRANSMITENTE|EMITENTE)[^\n]*/i,
    400,
  );
  const blocoAdquirente = bloco(text, /DADOS\s+DO\s+ADQUIRENTE[^\n]*/i, 400);
  const blocoTotais = bloco(text, /TOTAIS\s+DO\s+DOCUMENTO/i, 900);

  const atcud = primeiroGrupo(text, [/ATCUD[:\s]*([A-Z0-9]+-\d+)/i]);

  const numeroDocumento = primeiroGrupo(text, [
    // Formato AT: Fatura-Recibo <FR ATSIRE01FR/45>
    /Fatura[\s-]*Recibo\s*[<(]\s*([^>)\n]{3,40})\s*[>)]/i,
    /N[.ºo°]*\s*(?:do\s*)?documento[:\s]*([A-Za-z0-9/\-.]{3,30})/i,
    /Fatura[\s-]*Recibo\s*(?:n[.ºo°]*)?\s*[:\s]*([A-Za-z0-9/\-.]{3,30})/i,
    /Recibo\s*n[.ºo°]*\s*[:\s]*([A-Za-z0-9/\-.]{3,30})/i,
    /N[UÚ]MERO[:\s]*([A-Za-z0-9/\-.]{3,30})/i,
  ]) || atcud;

  const dataEmissao = paraDataISO(
    primeiroGrupo(text, [
      /emitida\s*em[:\s]*([\d/\-.]{8,10})/i,
      /Data\s*(?:de\s*)?emiss[aã]o[:\s]*([\d/\-.]{8,10})/i,
      /Emitido\s*em[:\s]*([\d/\-.]{8,10})/i,
      /Data\s*da\s*coloca[çc][aã]o[^\n]*?([\d/\-.]{8,10})/i,
      /Data[:\s]*([\d/\-.]{8,10})/i,
    ]),
  );

  const NIF_ETIQUETA = `N[UÚ]MERO\\s+DE\\s+IDENTIFICA[ÇC][AÃ]O\\s+FISCAL[^\\d]{0,20}${NIF}`;

  const nifEmitente =
    primeiroGrupo(blocoTransmitente, [new RegExp(NIF_ETIQUETA, "i")]) ||
    primeiroGrupo(text, [
      new RegExp(`(?:Emitente|Prestador(?:\\s*de\\s*servi[çc]os)?|Transmitente)[\\s\\S]{0,200}?NIF[:\\s-]*${NIF}`, "i"),
      new RegExp(`NIF\\s*(?:do\\s*)?emitente[:\\s]*${NIF}`, "i"),
    ]);

  const nifAdquirente =
    primeiroGrupo(blocoAdquirente, [new RegExp(NIF_ETIQUETA, "i")]) ||
    primeiroGrupo(text, [
      new RegExp(`(?:Adquirente|Cliente|Destinat[aá]rio)[\\s\\S]{0,200}?NIF[:\\s-]*${NIF}`, "i"),
      new RegExp(`NIF\\s*(?:do\\s*)?adquirente[:\\s]*${NIF}`, "i"),
    ]);

  const nomeEmitente =
    nomeDoBloco(blocoTransmitente) ||
    primeiroGrupo(text, [
      /(?:Emitente|Prestador(?:\s*de\s*servi[çc]os)?)[:\s]*(?:Nome[:\s]*)?([A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-Za-zÁÂÃÀÉÊÍÓÔÕÚÇáâãàéêíóôõúç' ]{5,80})/,
    ]);

  const nomeAdquirente =
    nomeDoBloco(blocoAdquirente) ||
    primeiroGrupo(text, [
      /(?:Adquirente|Cliente|Destinat[aá]rio)[:\s]*(?:Nome[:\s]*)?([A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-Za-zÁÂÃÀÉÊÍÓÔÕÚÇáâãàéêíóôõúç'&., ]{5,80})/,
    ]);

  const valorBase = paraNumero(
    primeiroGrupo(blocoTotais, [/Valor\s*il[íi]quido[^\d\n]{0,60}([\d.,]+)/i]) ||
      primeiroGrupo(text, [
        /(?:Valor\s*base|Base\s*(?:de\s*)?(?:incid[êe]ncia|tribut[aá]vel)|Valor\s*Tribut[aá]vel|Subtotal|Import[âa]ncia\s*recebida)[:\s]*([\d.,]+)/i,
      ]),
  );

  const valorIva = paraNumero(
    primeiroGrupo(blocoTotais, [/^\s*IVA[^\d\n]{0,60}([\d.,]+)/im]) ||
      primeiroGrupo(text, [/(?:Valor\s*(?:do\s*)?IVA|IVA\s*\(?\d{0,2}%?\)?)[:\s]*([\d.,]+)/i]),
  );

  const retencaoIrs = paraNumero(
    primeiroGrupo(blocoTotais, [/Reten[çc][aã]o\s*na\s*fonte\s*(?:de\s*)?IRS[^\d\n]{0,60}([\d.,]+)/i]) ||
      primeiroGrupo(text, [
        /(?:Reten[çc][aã]o\s*(?:na\s*fonte)?(?:\s*de\s*IRS)?|IRS\s*retido)[:\s(]*(?:\d{1,2}\s*%\s*)?[:\s)]*([\d.,]+)/i,
      ]),
  );

  const valorTotal = paraNumero(
    primeiroGrupo(blocoTotais, [
      /TOTAL\s*A\s*PAGAR[^\d\n]{0,60}([\d.,]+)/i,
      /TOTAL\s*DO\s*DOCUMENTO[^\d\n]{0,60}([\d.,]+)/i,
    ]) ||
      primeiroGrupo(text, [
        /(?:Total\s*(?:a\s*pagar|do\s*documento|geral)?|Valor\s*total)[:\s]*([\d.,]+)/i,
      ]),
  );

  const encontrados = [numeroDocumento, dataEmissao, nifEmitente, valorTotal].filter(Boolean).length;
  const confianca: GreenReceiptExtraction["confianca"] =
    encontrados >= 4 ? "alta" : encontrados >= 2 ? "media" : "baixa";

  return {
    numeroDocumento,
    dataEmissao,
    nifEmitente,
    nomeEmitente,
    nifAdquirente,
    nomeAdquirente,
    valorBase,
    valorIva,
    retencaoIrs,
    valorTotal,
    confianca,
    origem,
    texto: text,
  };
}

/** Indica se o texto lido do PDF é insuficiente e vale a pena recorrer ao OCR. */
export function reciboPrecisaOcr(text: string) {
  const parsed = parseGreenReceiptText(text, "pdf");
  return !parsed.numeroDocumento || !parsed.dataEmissao || parsed.valorTotal === null;
}

export interface AvisoValidacao {
  campo: string;
  mensagem: string;
  gravidade: "aviso" | "erro";
}

export interface DadosRecibo {
  numeroDocumento: string | null;
  dataEmissao: string | null;
  nifEmitente: string | null;
  nifAdquirente: string | null;
  valorBase: number | null;
  valorIva: number | null;
  retencaoIrs: number | null;
  valorTotal: number | null;
}

/** Valida os dados do recibo contra o perfil do motorista e da empresa. */
export function validarRecibo(
  dados: DadosRecibo,
  contexto: { nifMotorista?: string | null; nifEmpresa?: string | null; numerosExistentes: string[] },
): AvisoValidacao[] {
  const avisos: AvisoValidacao[] = [];
  const digitos = (v?: string | null) => (v || "").replace(/\D/g, "");

  if (!dados.numeroDocumento) {
    avisos.push({ campo: "numero", mensagem: "Número do documento não identificado.", gravidade: "aviso" });
  } else if (
    contexto.numerosExistentes.some(
      (n) => n.trim().toLowerCase() === dados.numeroDocumento!.trim().toLowerCase(),
    )
  ) {
    avisos.push({
      campo: "numero",
      mensagem: "Já enviaste um recibo com este número.",
      gravidade: "erro",
    });
  }

  if (!dados.dataEmissao) {
    avisos.push({ campo: "data", mensagem: "Data de emissão não identificada.", gravidade: "aviso" });
  } else if (new Date(dados.dataEmissao + "T00:00:00") > new Date()) {
    avisos.push({ campo: "data", mensagem: "A data de emissão está no futuro.", gravidade: "erro" });
  }

  if (contexto.nifMotorista && dados.nifEmitente) {
    if (digitos(dados.nifEmitente) !== digitos(contexto.nifMotorista)) {
      avisos.push({
        campo: "nif_emitente",
        mensagem: "O NIF do emitente não corresponde ao NIF do teu perfil.",
        gravidade: "aviso",
      });
    }
  }

  if (contexto.nifEmpresa && dados.nifAdquirente) {
    if (digitos(dados.nifAdquirente) !== digitos(contexto.nifEmpresa)) {
      avisos.push({
        campo: "nif_adquirente",
        mensagem: "O NIF do adquirente não corresponde ao NIF da empresa.",
        gravidade: "aviso",
      });
    }
  }

  if (dados.valorTotal === null) {
    avisos.push({ campo: "valor_total", mensagem: "Valor total não identificado.", gravidade: "aviso" });
  } else if (dados.valorBase !== null) {
    const esperado = dados.valorBase + (dados.valorIva || 0) - (dados.retencaoIrs || 0);
    if (Math.abs(esperado - dados.valorTotal) > 0.05) {
      avisos.push({
        campo: "valor_total",
        mensagem: `Os valores não somam: base + IVA − retenção dá ${esperado.toFixed(2)} €.`,
        gravidade: "aviso",
      });
    }
  }

  return avisos;
}
