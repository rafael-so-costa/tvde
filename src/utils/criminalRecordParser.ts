// Extração local (no browser) de dados do Certificado de Registo Criminal português (DGAJ).
//
// Formato real das certidões emitidas pelo Balcão Eletrónico:
//   NOME (NAME): RAFAEL SOARES COSTA
//   INFORMAÇÃO SOBRE O TITULAR DO REGISTO EM (...): 2026/03/04 21:04:26
//   CÓDIGO DE ACESSO (ACCESS CODE) : 6322-dd1f-97c0-39b32
//   CÓDIGO VIGENTE ATÉ (ACCESS CODE VALID UNTIL): 2026/06/02

export interface CriminalRecordExtraction {
  codigoConsulta: string | null;
  dataValidade: string | null; // ISO yyyy-mm-dd
  dataEmissao: string | null; // ISO yyyy-mm-dd
  nomeTitular: string | null;
  texto: string;
  confianca: "alta" | "media" | "baixa";
  origem: "pdf" | "ocr";
}

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(day: number, month: number, year: number): string | null {
  if (!day || !month || !year) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 100) year += 2000;
  if (year < 1900 || year > 2100) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Encontra a data que aparece mais cedo no trecho (yyyy/mm/dd, dd/mm/yyyy ou textual). */
function findDate(chunk: string): string | null {
  const candidates: { index: number; iso: string }[] = [];

  // yyyy/mm/dd ou yyyy-mm-dd (formato usado pela DGAJ)
  const ymd = chunk.match(/\b(\d{4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})\b/);
  if (ymd?.index !== undefined) {
    const iso = toISO(Number(ymd[3]), Number(ymd[2]), Number(ymd[1]));
    if (iso) candidates.push({ index: ymd.index, iso });
  }

  // dd/mm/yyyy
  const dmy = chunk.match(/\b(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})\b/);
  if (dmy?.index !== undefined) {
    const iso = toISO(Number(dmy[1]), Number(dmy[2]), Number(dmy[3]));
    if (iso) candidates.push({ index: dmy.index, iso });
  }

  const textual = chunk.match(/(\d{1,2})\s+de\s+([a-záàâãçéêíóôõú]+)\s+de\s+(\d{4})/i);
  if (textual?.index !== undefined) {
    const month = MONTHS[textual[2].toLowerCase()];
    const iso = month ? toISO(Number(textual[1]), month, Number(textual[3])) : null;
    if (iso) candidates.push({ index: textual.index, iso });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0].iso;
}

/** Remove a marca de água repetida e normaliza espaços, mantendo as linhas. */
function normalize(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/DIRE[ÇC][ÃA]ODESERVI[ÇC]OSDEIDENTIFICA[ÇÃC]{1,2}O?CRIMINAL/gi, " ")
    .replace(/[ \t]+/g, " ");
}

/** Primeira linha (ou trecho até fim de linha) após uma correspondência. */
function afterLabel(text: string, labelRe: RegExp, len = 120): string | null {
  const m = text.match(labelRe);
  if (m?.index === undefined) return null;
  const start = m.index + m[0].length;
  const slice = text.slice(start, start + len);
  const line = slice.split(/[\r\n]/)[0];
  return line ?? null;
}

const CODIGO_GRUPOS = /\b([0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4,6})\b/;

function extractCodigo(text: string): string | null {
  // 1) Valor imediatamente após o rótulo "CÓDIGO DE ACESSO ... (ACCESS CODE):"
  const labels = [
    /c[óo]digo\s+de\s+acesso[^:\n]*\(access\s+code\)\s*:/i,
    /c[óo]digo\s+de\s+(?:acesso|consulta|valida[çc][ãa]o|verifica[çc][ãa]o)\s*(?:\([^)]*\))?\s*:/i,
  ];
  for (const label of labels) {
    const line = afterLabel(text, label, 80);
    const found = line?.match(CODIGO_GRUPOS) || line?.match(/\b([0-9A-Za-z]{8,}(?:-[0-9A-Za-z]+)*)\b/);
    if (found) return found[1];
  }
  // 2) Qualquer bloco no formato xxxx-xxxx-xxxx-xxxxx presente no documento
  const grouped = text.match(CODIGO_GRUPOS);
  if (grouped) return grouped[1];
  return null;
}

// Rótulos tolerantes a OCR: os dois pontos podem faltar ou vir como "/", "-", ")".
function extractValidade(text: string): string | null {
  const patterns = [
    /c[óo]digo\s*vigente\s*at\s*[ée]\s*(?:\([^)]*\))?\s*[:/\-]?/i,
    /access\s*code\s*valid\s*until\s*\)?\s*[:/\-]?/i,
    /v[áa]lido\s+at[ée]\s*[:/\-]?/i,
    /validade\s*(?:do\s+certificado)?\s*[:/\-]?/i,
    /data\s+(?:de\s+)?(?:limite|fim)\s+de\s+validade\s*[:/\-]?/i,
  ];
  for (const re of patterns) {
    const line = afterLabel(text, re, 60);
    const d = line ? findDate(line) : null;
    if (d) return d;
  }
  return null;
}

function extractEmissao(text: string): string | null {
  const patterns = [
    /titular\s+do\s+registo\s+em\s*(?:\([^)]*\))?\s*[:/\-]?/i,
    /(?:data\s+(?:e\s+hora\s+)?d[ae]\s+)?emiss[ãa]o\s+em\s*[:/\-]?/i,
    /(?:data\s+de\s+)?emiss[ãa]o\s*[:/\-]?/i,
    /emitido\s+(?:em|a)\s*[:/\-]?/i,
  ];
  for (const re of patterns) {
    const line = afterLabel(text, re, 60);
    const d = line ? findDate(line) : null;
    if (d) return d;
  }
  return null;
}

const NOME_TOKEN = /^[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÇ'-]{1,}$/;
const CONECTOR = /^(de|da|do|dos|das|e)$/i;

function extractNome(text: string): string | null {
  const labels = [
    /\bnome\s*(?:completo)?\s*(?:\([^)]*\)|[a-z]+)?\s*[:)/\-]?/i,
    /\btitular\s*(?:\([^)]*\))?\s*[:)/\-]?/i,
  ];
  for (const label of labels) {
    const line = afterLabel(text, label, 140);
    if (!line) continue;
    const tokens = line
      .replace(/[^A-Za-zÁÂÃÀÉÊÍÓÔÕÚÇáâãàéêíóôõúç'\- ]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const nome: string[] = [];
    for (const token of tokens) {
      if (NOME_TOKEN.test(token) || (nome.length > 0 && CONECTOR.test(token))) {
        nome.push(token.toUpperCase() === token ? token : token);
      } else if (nome.length >= 2) {
        break;
      }
      if (nome.length >= 8) break;
    }
    if (nome.length >= 2) return nome.join(" ");
  }
  return null;
}

/** Sem validade explícita: o código de acesso da DGAJ é válido 90 dias após a emissão. */
function inferValidade(emissao: string | null): string | null {
  if (!emissao) return null;
  const d = new Date(emissao + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 90);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseCriminalRecordText(
  rawText: string,
  origem: "pdf" | "ocr",
): CriminalRecordExtraction {
  const text = normalize(rawText);
  const codigoConsulta = extractCodigo(text);
  const dataEmissao = extractEmissao(text);
  let dataValidade = extractValidade(text);
  let inferida = false;
  if (!dataValidade) {
    dataValidade = inferValidade(dataEmissao);
    inferida = !!dataValidade;
  }
  const nomeTitular = extractNome(text);

  let score = 0;
  if (codigoConsulta) score += 2;
  if (dataValidade && !inferida) score += 2;
  else if (dataValidade) score += 1;
  if (dataEmissao) score += 1;
  if (origem === "ocr") score -= 1;

  const confianca: CriminalRecordExtraction["confianca"] =
    score >= 4 ? "alta" : score >= 2 ? "media" : "baixa";

  return { codigoConsulta, dataValidade, dataEmissao, nomeTitular, texto: text, confianca, origem };
}

/** Verdadeiro quando faltam os campos essenciais — usado para decidir o recurso a OCR. */
export function faltamCamposEssenciais(texto: string): boolean {
  const t = normalize(texto);
  return !extractCodigo(t) || !extractValidade(t);
}
