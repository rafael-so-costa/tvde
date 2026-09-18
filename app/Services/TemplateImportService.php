<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Smalot\PdfParser\Parser;
use Throwable;
use ZipArchive;
use App\Models\TemplateContrato;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TemplateImportService
{
    public function __construct(
        private TemplateFieldDetector $fieldDetector
    ) {}

    public function preview(
        UploadedFile $file
    ): array {
        $extension = strtolower(
            $file->getClientOriginalExtension()
        );

        try {
            $content = match ($extension) {
                'txt' =>
                $this->extractTxt(
                    $file
                ),

                'docx' =>
                $this->extractDocx(
                    $file
                ),

                'pdf' =>
                $this->extractPdf(
                    $file
                ),

                default =>
                throw new RuntimeException(
                    'Formato não suportado.'
                ),
            };
        } catch (
            ValidationException $exception
        ) {
            throw $exception;
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'arquivo' =>
                'Não foi possível processar o documento: ' .
                    $exception->getMessage(),
            ]);
        }

        $content = trim(
            str_replace(
                ["\r\n", "\r"],
                "\n",
                $content
            )
        );

        if ($content === '') {
            throw ValidationException::withMessages([
                'arquivo' =>
                'Não foi possível extrair texto do documento.',
            ]);
        }

        return [
            'content' => $content,

            'fields' =>
            $this->fieldDetector
                ->detect($content),

            'file' => [
                'name' =>
                $file
                    ->getClientOriginalName(),

                'extension' =>
                $extension,

                'mime_type' =>
                $file->getMimeType(),

                'size' =>
                $file->getSize(),
            ],
        ];
    }

    public function import(
        UploadedFile $file,
        string $tenantId,
        string $nome,
        ?string $perfilId = null
    ): TemplateContrato {
        $preview = $this->preview($file);

        $extension = $preview['file']['extension'];

        $directory =
            'contract-templates/' .
            $tenantId;

        $filename =
            Str::uuid()->toString() .
            '.' .
            $extension;

        $path = Storage::disk('local')
            ->putFileAs(
                $directory,
                $file,
                $filename
            );

        if (!$path) {
            throw new RuntimeException(
                'Não foi possível armazenar o arquivo do template.'
            );
        }

        try {
            $template = DB::transaction(
                function () use (
                    $tenantId,
                    $perfilId,
                    $nome,
                    $path,
                    $extension,
                    $preview
                ): TemplateContrato {
                    $template =
                        new TemplateContrato([
                            'perfil_id' =>
                            $perfilId,

                            'nome' =>
                            $nome,

                            'arquivo_url' =>
                            $path,

                            'tipo_arquivo' =>
                            $extension,

                            'conteudo_original' =>
                            $preview['content'],

                            'campos_detectados' =>
                            $preview['fields'],

                            'campos_mapeados' =>
                            [],
                        ]);

                    $template->tenant_id =
                        $tenantId;

                    $template->save();

                    return $template;
                }
            );
        } catch (Throwable $exception) {
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }

        return $template->load(
            'perfil:id,nome'
        );
    }

    private function extractTxt(
        UploadedFile $file
    ): string {
        $content = file_get_contents(
            $file->getRealPath()
        );

        if ($content === false) {
            throw new RuntimeException(
                'Não foi possível ler o arquivo TXT.'
            );
        }

        return preg_replace(
            '/^\xEF\xBB\xBF/',
            '',
            $content
        ) ?? $content;
    }

    private function extractDocx(
        UploadedFile $file
    ): string {
        if (
            !class_exists(
                ZipArchive::class
            )
        ) {
            throw new RuntimeException(
                'A extensão ZIP do PHP não está disponível.'
            );
        }

        $zip = new ZipArchive();

        $result = $zip->open(
            $file->getRealPath()
        );

        if ($result !== true) {
            throw new RuntimeException(
                'O arquivo DOCX não é válido.'
            );
        }

        try {
            $xml = $zip->getFromName(
                'word/document.xml'
            );
        } finally {
            $zip->close();
        }

        if ($xml === false) {
            throw new RuntimeException(
                'O documento DOCX não contém word/document.xml.'
            );
        }

        $dom = new DOMDocument();

        $previous = libxml_use_internal_errors(
            true
        );

        try {
            if (!$dom->loadXML($xml)) {
                throw new RuntimeException(
                    'Não foi possível interpretar o conteúdo XML do DOCX.'
                );
            }
        } finally {
            libxml_clear_errors();

            libxml_use_internal_errors(
                $previous
            );
        }

        $xpath = new DOMXPath($dom);

        $xpath->registerNamespace(
            'w',
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        );

        $paragraphs = [];

        $nodes = $xpath->query(
            '//w:p'
        );

        if ($nodes === false) {
            throw new RuntimeException(
                'Não foi possível interpretar os parágrafos do DOCX.'
            );
        }

        foreach ($nodes as $paragraph) {
            $parts = [];

            $textNodes = $xpath->query(
                './/w:t',
                $paragraph
            );

            if ($textNodes === false) {
                continue;
            }

            foreach (
                $textNodes
                as $textNode
            ) {
                $parts[] =
                    $textNode->textContent;
            }

            $text = implode(
                '',
                $parts
            );

            if (
                trim($text) !== ''
            ) {
                $paragraphs[] =
                    $text;
            }
        }

        $content = implode(
            "\n",
            $paragraphs
        );

        if (
            trim($content) === ''
        ) {
            throw new RuntimeException(
                'Não foi possível extrair texto do DOCX.'
            );
        }

        return $content;
    }

    private function extractPdf(
        UploadedFile $file
    ): string {
        $parser = new Parser();

        $pdf = $parser->parseFile(
            $file->getRealPath()
        );

        $content = trim(
            $pdf->getText()
        );

        if ($content === '') {
            throw new RuntimeException(
                'O PDF não contém texto extraível. PDFs digitalizados como imagem precisarão de OCR.'
            );
        }

        return $content;
    }
}
