import {
    GlobalWorkerOptions,
    getDocument,
} from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export interface GreenReceiptReadResult {
    texto: string;

    numero_documento:
        | string
        | null;

    data_emissao:
        | string
        | null;

    nif_emitente:
        | string
        | null;

    nome_emitente:
        | string
        | null;

    nif_adquirente:
        | string
        | null;

    nome_adquirente:
        | string
        | null;

    valor_base:
        | number
        | null;

    valor_iva:
        | number
        | null;

    retencao_irs:
        | number
        | null;

    valor_total:
        | number
        | null;

    confianca: {
        texto: number;
        numero_documento: number;
        data_emissao: number;
        nif_emitente: number;
        nome_emitente: number;
        nif_adquirente: number;
        nome_adquirente: number;
        valor_base: number;
        valor_iva: number;
        retencao_irs: number;
        valor_total: number;
    };

    metodo:
        | 'pdf_texto'
        | 'ocr_pdf';
}

interface PositionedToken {
    text: string;
    x: number;
    y: number;
}

interface PositionedLine {
    y: number;
    tokens: PositionedToken[];
}

interface PartyData {
    nome: string | null;
    nif: string | null;
}

function normalizeText(
    value: string
): string {
    return value
        .replace(/\r/g,'\n')
        .replace(/[ \t]+/g,' ')
        .replace(/\n{3,}/g,'\n\n')
        .trim();
}

function fold(
    value: string
): string {
    return value
        .normalize('NFD')
        .replace(
            /\p{Diacritic}/gu,
            ''
        )
        .toUpperCase();
}

function parseDate(
    value: string
): string | null {
    const dayFirst=
        value.match(
            /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/
        );

    if(dayFirst){
        return buildDate(
            Number(dayFirst[3]),
            Number(dayFirst[2]),
            Number(dayFirst[1])
        );
    }

    const yearFirst=
        value.match(
            /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/
        );

    if(yearFirst){
        return buildDate(
            Number(yearFirst[1]),
            Number(yearFirst[2]),
            Number(yearFirst[3])
        );
    }

    return null;
}

function buildDate(
    year: number,
    month: number,
    day: number
): string | null {
    const date=
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

    if(
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ){
        return null;
    }

    return [
        String(year)
            .padStart(4,'0'),
        String(month)
            .padStart(2,'0'),
        String(day)
            .padStart(2,'0'),
    ].join('-');
}

function parseMoney(
    value: string
): number | null {
    let cleaned=value
        .replace(/[€\s]/g,'')
        .trim();

    if(!cleaned){
        return null;
    }

    if(
        cleaned.includes(',')
    ){
        cleaned=cleaned
            .replace(/\./g,'')
            .replace(',','.');
    }else{
        const dots=
            cleaned.match(/\./g);

        if(
            dots &&
            dots.length > 1
        ){
            const last=
                cleaned.lastIndexOf('.');

            cleaned=
                cleaned
                    .slice(0,last)
                    .replace(/\./g,'')+
                cleaned.slice(last);
        }
    }

    cleaned=cleaned.replace(
        /[^0-9.-]/g,
        ''
    );

    const number=
        Number(cleaned);

    if(
        !Number.isFinite(
            number
        )
    ){
        return null;
    }

    return Math.round(
        number * 100
    ) / 100;
}

function extractLastMoney(
    line: string
): number | null {
    const matches=
        line.match(
            /-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+(?:,\d{2})/g
        );

    if(
        !matches ||
        matches.length === 0
    ){
        return null;
    }

    return parseMoney(
        matches[
            matches.length - 1
        ]
    );
}

function normalizeNif(
    value: string
): string | null {
    const nif=
        value.replace(
            /\D/g,
            ''
        );

    if(
        nif.length !== 9
    ){
        return null;
    }

    return nif;
}

function fieldConfidence(
    value: unknown,
    confidence: number
): number {
    if(
        value === null ||
        value === undefined ||
        value === ''
    ){
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            1,
            confidence
        )
    );
}

function linesFromText(
    text: string
): string[] {
    return normalizeText(
        text
    )
        .split('\n')
        .map(
            (line)=>
                line
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim()
        )
        .filter(Boolean);
}

function findDocumentNumber(
    text: string
): string | null {
    /*
     * Modelo 2025:
     *
     * Fatura-Recibo
     * <FR ATSIRE01FR/8>
     */
    const modern=
        text.match(
            /FATURA[\s-]*RECIBO\s*<\s*(FR\s+ATSIRE[A-Z0-9]*FR\/\d+)\s*>/i
        );

    if(modern){
        return modern[1]
            .replace(
                /\s+/g,
                ' '
            )
            .trim();
    }

    /*
     * Algumas extrações podem separar
     * "Fatura-Recibo" do valor.
     */
    const modernLoose=
        text.match(
            /<\s*(FR\s+ATSIRE[A-Z0-9]*FR\/\d+)\s*>/i
        );

    if(modernLoose){
        return modernLoose[1]
            .replace(
                /\s+/g,
                ' '
            )
            .trim();
    }

    /*
     * Modelo antigo 2024:
     *
     * R ATSIRE01R/17
     */
    const legacy=
        text.match(
            /\b(R\s+ATSIRE[A-Z0-9]*R\/\d+)\b/i
        );

    if(legacy){
        return legacy[1]
            .replace(
                /\s+/g,
                ' '
            )
            .trim();
    }

    return null;
}

function findEmissionDate(
    text: string
): string | null {
    /*
     * Modelo 2025:
     * emitida em 11/03/2025
     */
    const modern=
        text.match(
            /EMITIDA\s+EM\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i
        );

    if(modern){
        return parseDate(
            modern[1]
        );
    }

    /*
     * Modelo 2024.
     *
     * O texto pode ficar:
     *
     * FATURA-RECIBO DATA DE EMISSÃO
     * R ATSIRE01R/19 04/06/2024
     *
     * Não confundir com:
     * DATA DA TRANSMISSÃO ... 03/06/2024
     */
    const lines=
        linesFromText(
            text
        );

    for(
        let index=0;
        index<lines.length;
        index+=1
    ){
        if(
            !fold(
                lines[index]
            ).includes(
                'DATA DE EMISSAO'
            )
        ){
            continue;
        }

        const end=
            Math.min(
                lines.length,
                index + 4
            );

        for(
            let cursor=index;
            cursor<end;
            cursor+=1
        ){
            const date=
                parseDate(
                    lines[cursor]
                );

            if(date){
                return date;
            }
        }
    }

    /*
     * Fallback específico do cabeçalho
     * antigo:
     *
     * R ATSIRE01R/19 04/06/2024
     */
    const legacyHeader=
        text.match(
            /\bR\s+ATSIRE[A-Z0-9]*R\/\d+\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i
        );

    if(legacyHeader){
        return parseDate(
            legacyHeader[1]
        );
    }

    return null;
}

function extractSection(
    text: string,
    start:
        RegExp
): string[] {
    const lines=
        linesFromText(
            text
        );

    let startIndex=-1;

    for(
        let index=0;
        index<lines.length;
        index+=1
    ){
        if(
            start.test(
                fold(
                    lines[index]
                )
            )
        ){
            startIndex=index;
            break;
        }
    }

    if(
        startIndex < 0
    ){
        return [];
    }

    let endIndex=
        lines.length;

    for(
        let index=startIndex+1;
        index<lines.length;
        index+=1
    ){
        const normalized=
            fold(
                lines[index]
            );

        if(
            normalized.startsWith(
                'DADOS DO '
            )
        ){
            endIndex=index;
            break;
        }
    }

    return lines.slice(
        startIndex + 1,
        endIndex
    );
}

function parsePartySection(
    text: string,
    heading: RegExp
): PartyData {
    const section=
        extractSection(
            text,
            heading
        );

    let nome:
        string | null = null;

    let nif:
        string | null = null;

    for(
        const line
        of section
    ){
        if(!nome){
            const nameMatch=
                line.match(
                    /^NOME\s+(.+?)(?=\s+(?:NIF|NÚMERO|NUMERO|DOMICÍLIO|DOMICILIO|SEDE|MORADA)\b|$)/i
                );

            if(nameMatch){
                const candidate=
                    nameMatch[1]
                        .replace(
                            /\s+/g,
                            ' '
                        )
                        .trim();

                if(
                    candidate.length >= 3 &&
                    candidate.length <= 255
                ){
                    nome=candidate;
                }
            }
        }

        if(!nif){
            const labelled=
                line.match(
                    /(?:NIF|NÚMERO\s+DE\s+IDENTIFICAÇÃO\s+FISCAL(?:\s*\(NIF\))?|NUMERO\s+DE\s+IDENTIFICACAO\s+FISCAL(?:\s*\(NIF\))?)\s*-?\s*:?\s*(\d{9})/i
                );

            if(labelled){
                nif=
                    normalizeNif(
                        labelled[1]
                    );
            }
        }

        if(!nif){
            const standalone=
                line.match(
                    /\b(\d{9})\b/
                );

            if(standalone){
                nif=
                    normalizeNif(
                        standalone[1]
                    );
            }
        }

        if(
            nome &&
            nif
        ){
            break;
        }
    }

    return {
        nome,
        nif,
    };
}

function findTotalsSection(
    text: string
): string[] {
    const lines=
        linesFromText(
            text
        );

    const index=
        lines.findIndex(
            (line)=>
                fold(line)
                    .includes(
                        'TOTAIS DO DOCUMENTO'
                    )
        );

    if(
        index < 0
    ){
        return [];
    }

    return lines.slice(
        index + 1,
        Math.min(
            lines.length,
            index + 12
        )
    );
}

function moneyForLabel(
    lines: string[],
    matcher: RegExp
): number | null {
    for(
        const line
        of lines
    ){
        if(
            !matcher.test(
                fold(line)
            )
        ){
            continue;
        }

        const amount=
            extractLastMoney(
                line
            );

        if(
            amount !== null
        ){
            return amount;
        }
    }

    return null;
}

function findModernValues(
    text: string
): {
    base: number | null;
    iva: number | null;
    retencao: number | null;
    total: number | null;
} {
    const totals=
        findTotalsSection(
            text
        );

    if(
        totals.length === 0
    ){
        return {
            base:null,
            iva:null,
            retencao:null,
            total:null,
        };
    }

    return {
        base:
            moneyForLabel(
                totals,
                /^VALOR ILIQUIDO\b/
            ),

        iva:
            moneyForLabel(
                totals,
                /^IVA\b/
            ),

        retencao:
            moneyForLabel(
                totals,
                /^RETENCAO NA FONTE IRS\b/
            ),

        total:
            moneyForLabel(
                totals,
                /^TOTAL A PAGAR\b/
            ) ??
            moneyForLabel(
                totals,
                /^TOTAL DO DOCUMENTO\b/
            ),
    };
}

function findLegacyValues(
    text: string
): {
    base: number | null;
    iva: number | null;
    retencao: number | null;
    total: number | null;
} {
    const lines=
        linesFromText(
            text
        );

    return {
        base:
            moneyForLabel(
                lines,
                /^VALOR BASE\b/
            ),

        iva:
            moneyForLabel(
                lines,
                /^IVA\s*:/
            ),

        retencao:
            moneyForLabel(
                lines,
                /^IRS\s*:/
            ),

        total:
            moneyForLabel(
                lines,
                /^IMPORTANCIA RECEBIDA\b/
            ),
    };
}

function parseReceipt(
    text: string,
    metodo:
        | 'pdf_texto'
        | 'ocr_pdf',
    confidence: number
): GreenReceiptReadResult {
    const numeroDocumento=
        findDocumentNumber(
            text
        );

    const dataEmissao=
        findEmissionDate(
            text
        );

    const emitente=
        parsePartySection(
            text,
            /DADOS DO TRANSMITENTE DE BENS OU DO PRESTADOR DE SERVICOS/
        );

    const adquirente=
        parsePartySection(
            text,
            /DADOS DO ADQUIRENTE DE BENS OU DE SERVICOS/
        );

    const modern=
        findModernValues(
            text
        );

    const legacy=
        findLegacyValues(
            text
        );

    const valorBase=
        modern.base ??
        legacy.base;

    const valorIva=
        modern.iva ??
        legacy.iva;

    const retencaoIrs=
        modern.retencao ??
        legacy.retencao;

    const valorTotal=
        modern.total ??
        legacy.total;

    return {
        texto:
            normalizeText(
                text
            ),

        numero_documento:
            numeroDocumento,

        data_emissao:
            dataEmissao,

        nif_emitente:
            emitente.nif,

        nome_emitente:
            emitente.nome,

        nif_adquirente:
            adquirente.nif,

        nome_adquirente:
            adquirente.nome,

        valor_base:
            valorBase,

        valor_iva:
            valorIva,

        retencao_irs:
            retencaoIrs,

        valor_total:
            valorTotal,

        confianca:{
            texto:
                confidence,

            numero_documento:
                fieldConfidence(
                    numeroDocumento,
                    confidence
                ),

            data_emissao:
                fieldConfidence(
                    dataEmissao,
                    confidence
                ),

            nif_emitente:
                fieldConfidence(
                    emitente.nif,
                    confidence
                ),

            nome_emitente:
                fieldConfidence(
                    emitente.nome,
                    confidence
                ),

            nif_adquirente:
                fieldConfidence(
                    adquirente.nif,
                    confidence
                ),

            nome_adquirente:
                fieldConfidence(
                    adquirente.nome,
                    confidence
                ),

            valor_base:
                fieldConfidence(
                    valorBase,
                    confidence
                ),

            valor_iva:
                fieldConfidence(
                    valorIva,
                    confidence
                ),

            retencao_irs:
                fieldConfidence(
                    retencaoIrs,
                    confidence
                ),

            valor_total:
                fieldConfidence(
                    valorTotal,
                    confidence
                ),
        },

        metodo,
    };
}

function coreScore(
    result:
        GreenReceiptReadResult
): number {
    return [
        result.numero_documento,
        result.data_emissao,
        result.nif_emitente,
        result.nif_adquirente,
        result.valor_base,
        result.valor_total,
    ].filter(
        (value)=>
            value !== null &&
            value !== ''
    ).length;
}

function totalScore(
    result:
        GreenReceiptReadResult
): number {
    return [
        result.numero_documento,
        result.data_emissao,
        result.nif_emitente,
        result.nome_emitente,
        result.nif_adquirente,
        result.nome_adquirente,
        result.valor_base,
        result.valor_iva,
        result.retencao_irs,
        result.valor_total,
    ].filter(
        (value)=>
            value !== null &&
            value !== ''
    ).length;
}

function positionedTextToLines(
    tokens:
        PositionedToken[]
): string {
    const lines:
        PositionedLine[] = [];

    /*
     * Em vez de confiar na ordem interna
     * do PDF, reconstruímos as linhas
     * através das coordenadas X/Y.
     *
     * Isto é essencial nos recibos das
     * Finanças, sobretudo no modelo 2024.
     */
    for(
        const token
        of tokens
    ){
        let line=
            lines.find(
                (candidate)=>
                    Math.abs(
                        candidate.y-
                        token.y
                    ) <= 2.5
            );

        if(!line){
            line={
                y:token.y,
                tokens:[],
            };

            lines.push(
                line
            );
        }

        line.tokens.push(
            token
        );
    }

    lines.sort(
        (a,b)=>
            b.y-a.y
    );

    return lines
        .map(
            (line)=>
                line.tokens
                    .sort(
                        (a,b)=>
                            a.x-b.x
                    )
                    .map(
                        (token)=>
                            token.text
                    )
                    .join(' ')
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim()
        )
        .filter(Boolean)
        .join('\n');
}

async function extractPdfText(
    file: File
): Promise<{
    text: string;
    document: Awaited<
        ReturnType<
            typeof getDocument
        >['promise']
    >;
}> {
    const bytes=
        new Uint8Array(
            await file
                .arrayBuffer()
        );

    const loadingTask=
        getDocument({
            data:bytes,
        });

    const document=
        await loadingTask.promise;

    /*
     * Todos os campos necessários estão
     * na primeira página.
     *
     * Alguns PDFs do Portal das Finanças
     * incluem "Original" e "Duplicado"
     * como páginas distintas.
     *
     * Não precisamos processar a segunda
     * cópia.
     */
    const page=
        await document.getPage(
            1
        );

    const content=
        await page.getTextContent();

    const tokens:
        PositionedToken[] = [];

    for(
        const item
        of content.items
    ){
        if(
            typeof item !==
                'object' ||
            item === null ||
            !('str' in item) ||
            !('transform' in item)
        ){
            continue;
        }

        const text=
            String(
                item.str
            ).trim();

        if(!text){
            continue;
        }

        const transform=
            item.transform;

        if(
            !Array.isArray(
                transform
            ) ||
            transform.length < 6
        ){
            continue;
        }

        tokens.push({
            text,
            x:Number(
                transform[4]
            ),
            y:Number(
                transform[5]
            ),
        });
    }

    return {
        text:
            normalizeText(
                positionedTextToLines(
                    tokens
                )
            ),

        document,
    };
}

function createCanvas(
    width: number,
    height: number
): HTMLCanvasElement {
    const canvas=
        document.createElement(
            'canvas'
        );

    canvas.width=
        Math.ceil(
            width
        );

    canvas.height=
        Math.ceil(
            height
        );

    return canvas;
}

async function ocrPdf(
    document: Awaited<
        ReturnType<
            typeof getDocument
        >['promise']
    >
): Promise<{
    text: string;
    confidence: number;
}> {
    const worker=
        await createWorker(
            'por'
        );

    try{
        /*
         * Também só precisamos da
         * primeira página no OCR.
         */
        const page=
            await document.getPage(
                1
            );

        const viewport=
            page.getViewport({
                scale:2.4,
            });

        const canvas=
            createCanvas(
                viewport.width,
                viewport.height
            );

        const context=
            canvas.getContext(
                '2d'
            );

        if(!context){
            throw new Error(
                'Não foi possível preparar o recibo para OCR.'
            );
        }

        await page.render({
            canvasContext:
                context,
            viewport,
            canvas,
        }).promise;

        const result=
            await worker.recognize(
                canvas
            );

        return {
            text:
                normalizeText(
                    result.data
                        .text
                ),

            confidence:
                Math.max(
                    0,
                    Math.min(
                        1,
                        result.data
                            .confidence /
                            100
                    )
                ),
        };
    }finally{
        await worker.terminate();
    }
}

export async function readGreenReceipt(
    file: File
): Promise<GreenReceiptReadResult> {
    const pdf=
        await extractPdfText(
            file
        );

    const direct=
        parseReceipt(
            pdf.text,
            'pdf_texto',
            1
        );

    /*
     * Número, emissão, dois NIFs,
     * base e total formam os seis
     * campos estruturais essenciais.
     *
     * Se todos forem encontrados,
     * não há motivo para executar OCR.
     */
    if(
        coreScore(
            direct
        ) === 6
    ){
        return direct;
    }

    /*
     * OCR apenas como fallback.
     * Comparamos o resultado final
     * para não substituir uma extração
     * PDF razoável por OCR pior.
     */
    const ocr=
        await ocrPdf(
            pdf.document
        );

    const recognized=
        parseReceipt(
            ocr.text,
            'ocr_pdf',
            ocr.confidence
        );

    if(
        totalScore(
            recognized
        ) >
        totalScore(
            direct
        )
    ){
        return recognized;
    }

    return direct;
}
