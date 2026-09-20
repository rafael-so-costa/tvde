import {
    GlobalWorkerOptions,
    getDocument,
} from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export interface CriminalRecordReadResult {
    texto: string;
    codigo_consulta: string | null;
    data_emissao: string | null;
    data_validade: string | null;
    nome_titular: string | null;
    confianca: {
        texto: number;
        codigo_consulta: number;
        data_emissao: number;
        data_validade: number;
        nome_titular: number;
    };
    metodo:
        | 'pdf_texto'
        | 'ocr_imagem'
        | 'ocr_pdf';
}

function normalizeText(
    value: string
): string {
    return value
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function foldText(
    value: string
): string {
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase();
}

function sanitizeCertificateText(
    value: string
): string {
    const text =
        normalizeText(value);

    const markers = [
        /DIRE[CÇ][AÃ]O-GERAL\s+DA\s+ADMINISTRA[CÇ][AÃ]O\s+DA\s+JUSTI[CÇ]A/i,
        /CERTIFICADO\s+DO\s+REGISTO\s+CRIMINAL/i,
        /BALC[AÃ]O\s+ELETR[ÓO]NICO/i,
    ];

    const positions = markers
        .map((pattern) =>
            text.search(pattern)
        )
        .filter(
            (position) =>
                position >= 0
        );

    /*
     * Nos PDFs digitais válidos, o conteúdo
     * real aparece depois da enorme camada
     * textual da marca de segurança.
     */
    if (positions.length > 0) {
        return normalizeText(
            text.slice(
                Math.min(...positions)
            )
        );
    }

    /*
     * Alguns certificados não expõem os
     * campos principais na camada PDF.
     * Eliminamos o máximo possível da
     * marca d'água antes de decidir se
     * será necessário OCR.
     */
    const lines = text
        .split('\n')
        .filter((line) => {
            const compact =
                foldText(line)
                    .replace(
                        /[^A-Z0-9]/g,
                        ''
                    );

            if (
                compact.length > 80 &&
                compact.includes(
                    'DIRECAODESERVICOSDEIDENTIFICACAOCRIMINAL'
                )
            ) {
                return false;
            }

            return true;
        });

    return normalizeText(
        lines.join('\n')
    );
}

function flatText(
    value: string
): string {
    return sanitizeCertificateText(
        value
    )
        .replace(/\s+/g, ' ')
        .trim();
}

function validDate(
    year: number,
    month: number,
    day: number
): boolean {
    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day
        )
    );

    return (
        date.getUTCFullYear() ===
            year &&
        date.getUTCMonth() ===
            month - 1 &&
        date.getUTCDate() ===
            day
    );
}

function isoDate(
    year: number,
    month: number,
    day: number
): string | null {
    if (
        !validDate(
            year,
            month,
            day
        )
    ) {
        return null;
    }

    return [
        String(year).padStart(
            4,
            '0'
        ),
        String(month).padStart(
            2,
            '0'
        ),
        String(day).padStart(
            2,
            '0'
        ),
    ].join('-');
}

function dateToIso(
    value: string
): string | null {
    const cleaned =
        value.trim();

    /*
     * Formato real dos certificados:
     * 2026/08/23
     */
    const yearFirst =
        cleaned.match(
            /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/
        );

    if (yearFirst) {
        return isoDate(
            Number(
                yearFirst[1]
            ),
            Number(
                yearFirst[2]
            ),
            Number(
                yearFirst[3]
            )
        );
    }

    /*
     * Mantemos suporte a documentos
     * externos no formato português.
     */
    const dayFirst =
        cleaned.match(
            /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
        );

    if (dayFirst) {
        return isoDate(
            Number(
                dayFirst[3]
            ),
            Number(
                dayFirst[2]
            ),
            Number(
                dayFirst[1]
            )
        );
    }

    return null;
}

function cleanCode(
    value: string
): string | null {
    const code = value
        .replace(/\s+/g, '')
        .replace(/[–—]/g, '-')
        .toLowerCase()
        .trim();

    if (
        !/^[a-z0-9]{4}-(?:[a-z0-9]{4}-){2}[a-z0-9]{4,5}$/.test(
            code
        )
    ) {
        return null;
    }

    return code;
}

function findCode(
    text: string
): string | null {
    const value =
        flatText(text);

    /*
     * Importante:
     *
     * NÃO usar:
     * "CÓDIGO DE ACESSO PEDIDO PELO TITULAR..."
     *
     * O código real está somente em:
     * "CÓDIGO DE ACESSO (ACCESS CODE): ..."
     */
    const match =
        value.match(
            /C[ÓO]DIGO\s+DE\s+ACESSO(?:\s*\(\s*ACCESS\s+CODE\s*\))?\s*:\s*([A-Z0-9]{4}\s*[-–—]\s*[A-Z0-9]{4}\s*[-–—]\s*[A-Z0-9]{4}\s*[-–—]\s*[A-Z0-9]{4,5})/i
        );

    if (!match) {
        return null;
    }

    return cleanCode(
        match[1]
    );
}

function findIssueDate(
    text: string
): string | null {
    const value =
        flatText(text);

    /*
     * O certificado não usa literalmente
     * "Data de emissão".
     *
     * O momento relevante aparece em:
     *
     * INFORMAÇÃO SOBRE O TITULAR
     * DO REGISTO EM: AAAA/MM/DD HH:MM:SS
     */
    const match =
        value.match(
            /INFORMA[CÇ][AÃ]O\s+SOBRE\s+O\s+TITULAR\s+DO\s+REGISTO\s+EM(?:\s*\([^)]*\))?\s*:\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2})(?:\s+\d{1,2}:\d{2}:\d{2})?/i
        );

    if (!match) {
        return null;
    }

    return dateToIso(
        match[1]
    );
}

function findValidUntil(
    text: string
): string | null {
    const value =
        flatText(text);

    /*
     * Validade real:
     *
     * CÓDIGO VIGENTE ATÉ
     * (ACCESS CODE VALID UNTIL):
     * AAAA/MM/DD
     */
    const match =
        value.match(
            /C[ÓO]DIGO\s+VIGENTE\s+AT[ÉE](?:\s*\(\s*ACCESS\s+CODE\s+VALID\s+UNTIL\s*\))?\s*:\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2})/i
        );

    if (!match) {
        return null;
    }

    return dateToIso(
        match[1]
    );
}

function findHolderName(
    text: string
): string | null {
    const body =
        sanitizeCertificateText(
            text
        );

    const lines = body
        .split('\n')
        .map((line) =>
            line.trim()
        )
        .filter(Boolean);

    for (const line of lines) {
        const match =
            line.match(
                /^NOME\s*(?:\(\s*NAME\s*\))?\s*:\s*(.+)$/i
            );

        if (!match) {
            continue;
        }

        const name =
            match[1]
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();

        if (
            name.length >= 3 &&
            name.length <= 255
        ) {
            return name;
        }
    }

    return null;
}

function hasUsableCertificateText(
    text: string
): boolean {
    const value =
        foldText(
            flatText(text)
        );

    /*
     * Não usamos quantidade de caracteres.
     *
     * A marca d'água sozinha pode gerar
     * milhares de caracteres e dar um
     * falso positivo.
     */
    const hasCode =
        /CODIGO\s+DE\s+ACESSO(?:\s*\(\s*ACCESS\s+CODE\s*\))?\s*:/.test(
            value
        );

    const hasValidity =
        /CODIGO\s+VIGENTE\s+ATE/.test(
            value
        );

    const hasIssue =
        /INFORMACAO\s+SOBRE\s+O\s+TITULAR\s+DO\s+REGISTO\s+EM/.test(
            value
        );

    return (
        hasCode &&
        hasValidity &&
        hasIssue
    );
}

function fieldConfidence(
    exists: boolean,
    base: number
): number {
    if (!exists) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            1,
            base
        )
    );
}

function parseDocument(
    text: string,
    method:
        | 'pdf_texto'
        | 'ocr_imagem'
        | 'ocr_pdf',
    textConfidence: number
): CriminalRecordReadResult {
    const body =
        sanitizeCertificateText(
            text
        );

    const codigo =
        findCode(body);

    const emissao =
        findIssueDate(body);

    const validade =
        findValidUntil(body);

    const nome =
        findHolderName(body);

    return {
        texto: body,
        codigo_consulta:
            codigo,
        data_emissao:
            emissao,
        data_validade:
            validade,
        nome_titular:
            nome,
        confianca: {
            texto:
                textConfidence,
            codigo_consulta:
                fieldConfidence(
                    Boolean(codigo),
                    textConfidence
                ),
            data_emissao:
                fieldConfidence(
                    Boolean(emissao),
                    textConfidence
                ),
            data_validade:
                fieldConfidence(
                    Boolean(validade),
                    textConfidence
                ),
            nome_titular:
                fieldConfidence(
                    Boolean(nome),
                    textConfidence
                ),
        },
        metodo: method,
    };
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
    const bytes =
        new Uint8Array(
            await file.arrayBuffer()
        );

    const loadingTask =
        getDocument({
            data: bytes,
        });

    const document =
        await loadingTask.promise;

    const pages =
        Math.min(
            document.numPages,
            3
        );

    const contents:
        string[] = [];

    for (
        let pageNumber = 1;
        pageNumber <= pages;
        pageNumber += 1
    ) {
        const page =
            await document.getPage(
                pageNumber
            );

        const textContent =
            await page.getTextContent();

        const pageText =
            textContent.items
                .map((item) => {
                    if (
                        typeof item ===
                            'object' &&
                        item !== null &&
                        'str' in item
                    ) {
                        return String(
                            item.str
                        );
                    }

                    return '';
                })
                .filter(Boolean)
                .join(' ');

        contents.push(
            pageText
        );
    }

    return {
        text: normalizeText(
            contents.join('\n')
        ),
        document,
    };
}

function documentCanvas(
    width: number,
    height: number
): HTMLCanvasElement {
    const canvas =
        document.createElement(
            'canvas'
        );

    canvas.width =
        Math.ceil(width);

    canvas.height =
        Math.ceil(height);

    return canvas;
}

function prepareCanvasForOcr(
    canvas: HTMLCanvasElement
): void {
    const context =
        canvas.getContext(
            '2d',
            {
                willReadFrequently:
                    true,
            }
        );

    if (!context) {
        return;
    }

    const image =
        context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const data =
        image.data;

    /*
     * Estes certificados têm uma marca
     * d'água cinzenta muito extensa.
     *
     * O threshold remove grande parte
     * dela e preserva o texto preto
     * principal para o Tesseract.
     */
    for (
        let index = 0;
        index < data.length;
        index += 4
    ) {
        const red =
            data[index];

        const green =
            data[index + 1];

        const blue =
            data[index + 2];

        const luminance =
            red * 0.299 +
            green * 0.587 +
            blue * 0.114;

        const value =
            luminance < 175
                ? 0
                : 255;

        data[index] =
            value;

        data[index + 1] =
            value;

        data[index + 2] =
            value;
    }

    context.putImageData(
        image,
        0,
        0
    );
}

async function recognizeImage(
    image: File | string
): Promise<{
    text: string;
    confidence: number;
}> {
    const worker =
        await createWorker(
            'por'
        );

    try {
        const result =
            await worker.recognize(
                image
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
                        100,
                        result.data
                            .confidence
                    )
                ) / 100,
        };
    } finally {
        await worker.terminate();
    }
}

async function recognizeScannedPdf(
    document: Awaited<
        ReturnType<
            typeof getDocument
        >['promise']
    >
): Promise<{
    text: string;
    confidence: number;
}> {
    const worker =
        await createWorker(
            'por'
        );

    const texts:
        string[] = [];

    const confidences:
        number[] = [];

    try {
        const pages =
            Math.min(
                document.numPages,
                2
            );

        for (
            let pageNumber = 1;
            pageNumber <= pages;
            pageNumber += 1
        ) {
            const page =
                await document.getPage(
                    pageNumber
                );

            const viewport =
                page.getViewport({
                    scale: 2.5,
                });

            const canvas =
                documentCanvas(
                    viewport.width,
                    viewport.height
                );

            const context =
                canvas.getContext(
                    '2d'
                );

            if (!context) {
                throw new Error(
                    'Não foi possível preparar o OCR do PDF.'
                );
            }

            await page.render({
                canvasContext:
                    context,
                viewport,
                canvas,
            }).promise;

            prepareCanvasForOcr(
                canvas
            );

            const result =
                await worker.recognize(
                    canvas
                );

            texts.push(
                result.data.text
            );

            confidences.push(
                result.data
                    .confidence
            );
        }
    } finally {
        await worker.terminate();
    }

    const average =
        confidences.length
            ? confidences.reduce(
                  (
                      total,
                      confidence
                  ) =>
                      total +
                      confidence,
                  0
              ) /
              confidences.length /
              100
            : 0;

    return {
        text: normalizeText(
            texts.join('\n')
        ),
        confidence:
            Math.max(
                0,
                Math.min(
                    1,
                    average
                )
            ),
    };
}

export async function readCriminalRecord(
    file: File
): Promise<CriminalRecordReadResult> {
    const isPdf =
        file.type ===
            'application/pdf' ||
        file.name
            .toLowerCase()
            .endsWith('.pdf');

    if (isPdf) {
        const pdf =
            await extractPdfText(
                file
            );

        /*
         * Só confiamos na camada textual
         * quando encontramos os três
         * campos estruturais reais.
         *
         * Isto resolve o certificado
         * 23/08/2026, cuja camada textual
         * contém sobretudo a marca d'água.
         */
        if (
            hasUsableCertificateText(
                pdf.text
            )
        ) {
            return parseDocument(
                pdf.text,
                'pdf_texto',
                1
            );
        }

        const ocr =
            await recognizeScannedPdf(
                pdf.document
            );

        return parseDocument(
            ocr.text,
            'ocr_pdf',
            ocr.confidence
        );
    }

    const ocr =
        await recognizeImage(
            file
        );

    return parseDocument(
        ocr.text,
        'ocr_imagem',
        ocr.confidence
    );
}
