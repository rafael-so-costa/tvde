<?php

declare(strict_types=1);

namespace App\Services;

/**
 * FrotaPro 4R.14B.5I.
 *
 * Formatacao visual da declaracao RGPD 1.2, sem alterar o modelo
 * versionado no SaaS, os valores de consentimento ou o checksum.
 */
final class FrotaProRgpdV12PdfFormatter
{
    private const TITLE = 'DECLARAÇÃO DE PROTEÇÃO DE DADOS E PRIVACIDADE';

    public function format(string $html): string
    {
        if (trim($html) === '' || str_contains($html, 'rgpd-v12-document')) {
            return $html;
        }

        // O conversor antigo trata a primeira linha numerada como titulo.
        // As secoes seguintes tambem precisam de uma hierarquia visivel.
        $formatted = preg_replace_callback(
            '~<(div|p)\s+class="(?:doc-title|doc-paragraph)">\s*((?:[1-8]\.\s+|7\.[1-3]\s*[—–-]\s+)[^<]{3,130})\s*</\1>~iu',
            static function (array $match): string {
                $heading = trim($match[2]);
                $subsection = preg_match(
                    '/^7\.[1-3]\s*[—–-]\s+/u',
                    $heading
                ) === 1;

                $tag = $subsection ? 'h3' : 'h2';
                $class = $subsection
                    ? 'rgpd-v12-subsection'
                    : 'rgpd-v12-section';

                return '<'.$tag.' class="'.$class.'">'
                    .$heading.'</'.$tag.'>';
            },
            $html
        ) ?? $html;

        $plain = html_entity_decode(
            strip_tags($formatted),
            ENT_QUOTES | ENT_HTML5,
            'UTF-8'
        );

        if (preg_match('/DECLARAÇÃO\s+DE\s+PROTEÇÃO\s+DE\s+DADOS\s+E\s+PRIVACIDADE/iu', $plain) !== 1) {
            $formatted = '<h1 class="doc-title rgpd-v12-title">'
                .self::TITLE.'</h1>' . "\n" . $formatted;
        }

        return '<div class="rgpd-v12-document">' . "\n"
            . $formatted . "\n" . '</div>';
    }
}
