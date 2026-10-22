<?php

namespace App\Services;

final class FrotaProFormalDocumentFormatter
{
    public function format(string $html): string
    {
        if (trim($html) === '') {
            return $html;
        }

        if (preg_match('/class\s*=\s*["\'][^"\']*(?:doc-title|clause-heading|clause-title)[^"\']*["\']/iu', $html)) {
            return $html;
        }

        // Preservar templates HTML estruturados.
        if (preg_match('/<(?:table|div|h[1-6]|img|ul|ol|section|header|footer)\b/i', $html)) {
            return $html;
        }

        $text = preg_replace('/<br\s*\/?>/i', "\n", $html);
        $text = preg_replace('/<\/p\s*>/i', "\n\n", (string) $text);
        $text = preg_replace('/<p\b[^>]*>/i', '', (string) $text);
        $text = preg_replace('/<\/?(?:strong|b|em|i|span)\b[^>]*>/i', '', (string) $text);

        if (preg_match('/<[^>]+>/', (string) $text)) {
            return $html;
        }

        $text = html_entity_decode(
            (string) $text,
            ENT_QUOTES | ENT_HTML5,
            'UTF-8'
        );

        $text = str_replace("\xc2\xa0", ' ', $text);
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[\t ]*\n[\t ]*/u', "\n", $text);
        $text = trim((string) preg_replace('/\n{3,}/', "\n\n", (string) $text));

        if ($text === '') {
            return '';
        }

        $blocks = preg_split('/\n{2,}/u', $text) ?: [];
        $result = [];
        $signatures = [];
        $fieldBuffer = [];
        $count = count($blocks);

        for ($i = 0; $i < $count; $i++) {
            $block = trim($blocks[$i]);

            if ($block === '') {
                continue;
            }

            $lines = array_values(array_filter(
                array_map('trim', explode("\n", $block)),
                static fn (string $line): bool => $line !== ''
            ));

            if ($lines === []) {
                continue;
            }

            $first = $lines[0];

            if (
                count($lines) === 1 &&
                preg_match('/^([^:]{3,55}):\s*(.+)$/u', $first, $match) &&
                !preg_match('/^(?:CONSIDERANDO QUE|CONSIDERANDOS):/iu', $first)
            ) {
                if ($signatures !== []) {
                    $result[] = $this->signatureGrid($signatures);
                    $signatures = [];
                }

                $fieldBuffer[] = [
                    trim($match[1]),
                    trim($match[2])
                ];

                continue;
            }

            if ($fieldBuffer !== []) {
                $result[] = count($fieldBuffer) >= 3
                    ? $this->fieldsTable($fieldBuffer)
                    : implode("\n", array_map(
                        fn(array $item): string =>
                            '<p class="doc-paragraph">'.
                            $this->esc($item[0].': '.$item[1]).
                            '</p>',
                        $fieldBuffer
                    ));

                $fieldBuffer = [];
            }

            if ($this->isSignatureLabel($first)) {
                $signatures[] = $first;

                if (
                    isset($blocks[$i + 1]) &&
                    preg_match(
                        '/^[_\-\s]{8,}$/u',
                        trim($blocks[$i + 1])
                    )
                ) {
                    $i++;
                }

                continue;
            }

            if ($signatures !== []) {
                $result[] = $this->signatureGrid($signatures);
                $signatures = [];
            }

            if (preg_match('/^[_\-\s]{8,}$/u', $block)) {
                $result[] = '<div class="contract-signature-rule"></div>';
                continue;
            }

            if (
                preg_match('/^(?:CONTRATO|DECLARAÇÃO|AUTORIZAÇÃO|TERMO|ACORDO)\b/iu', $first) &&
                preg_match('/\p{Ll}/u', $first) === 0 &&
                count($lines) === 1
            ) {
                $result[] =
                    '<h1 class="doc-title">'.
                    $this->esc($first).
                    '</h1>';

                continue;
            }

            if (
                preg_match(
                    '/^CL[ÁA]USULA\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9.ºª\- ]+$/u',
                    $first
                )
            ) {
                $subtitle = count($lines) > 1
                    ? implode(' ', array_slice($lines, 1))
                    : '';

                if ($subtitle === '' && isset($blocks[$i + 1])) {
                    $candidate = trim($blocks[$i + 1]);

                    if (
                        $candidate !== '' &&
                        !preg_match('/\n/u', $candidate) &&
                        strlen($candidate) <= 120 &&
                        !preg_match('/^[0-9]+[.)]/', $candidate)
                    ) {
                        $subtitle = $candidate;
                        $i++;
                    }
                }

                $result[] =
                    '<div class="clause-heading">'.
                    '<h2>'.$this->esc($first).'</h2>'.
                    (
                        $subtitle !== ''
                        ? '<h3>'.$this->esc($subtitle).'</h3>'
                        : ''
                    ).
                    '</div>';

                continue;
            }

            if (
                preg_match(
                    '/^(?:ENTRE|E|CONSIDERANDO QUE:?|CONSIDERANDOS|ACORDAM|IDENTIFICAÇÃO DAS PARTES|PARTES CONTRATANTES)$/iu',
                    $block
                )
            ) {
                $cls = $first === 'E'
                    ? 'contract-party-divider'
                    : 'doc-section-label';

                $result[] =
                    '<div class="'.$cls.'">'.
                    $this->esc($block).
                    '</div>';

                continue;
            }

            $fields = [];

            foreach ($lines as $line) {
                if (preg_match('/^([^:]{3,55}):\s*(.+)$/u', $line, $m)) {
                    $fields[] = [
                        trim($m[1]),
                        trim($m[2])
                    ];
                }
            }

            if (
                count($fields) >= 3 &&
                count($fields) === count($lines)
            ) {
                $result[] = $this->fieldsTable($fields);
                continue;
            }

            $lineHtml = [];

            foreach ($lines as $line) {
                $lineHtml[] = $this->esc($line);
            }

            $class = preg_match(
                '/^(?:[0-9]+[.)]|[a-z][)])\s+/u',
                $first
            )
                ? 'doc-paragraph doc-numbered'
                : 'doc-paragraph';

            $result[] =
                '<p class="'.$class.'">'.
                implode('<br>', $lineHtml).
                '</p>';
        }

        if ($fieldBuffer !== []) {
            $result[] = count($fieldBuffer) >= 3
                ? $this->fieldsTable($fieldBuffer)
                : implode("\n", array_map(
                    fn(array $item): string =>
                        '<p class="doc-paragraph">'.
                        $this->esc($item[0].': '.$item[1]).
                        '</p>',
                    $fieldBuffer
                ));
        }

        if ($signatures !== []) {
            $result[] = $this->signatureGrid($signatures);
        }

        return implode("\n", $result);
    }

    private function fieldsTable(array $fields): string
    {
        $rows = [];

        foreach (array_chunk($fields, 2) as $pair) {
            $cells = '';

            foreach ($pair as [$name, $value]) {
                $cells .=
                    '<th>'.
                    $this->esc(str_replace('/', ' / ', $name)).
                    '</th>'.
                    '<td>'.
                    $this->esc($value).
                    '</td>';
            }

            if (count($pair) === 1) {
                $cells .= '<th></th><td></td>';
            }

            $rows[] = '<tr>'.$cells.'</tr>';
        }

        return
            '<table class="contract-detail-table">'.
            '<tbody>'.
            implode('', $rows).
            '</tbody>'.
            '</table>';
    }

    private function isSignatureLabel(string $text): bool
    {
        return strlen($text) <= 120 &&
            (bool) preg_match(
                '/^(?:(?:A|O|AS|OS)\s+)?(?:LOCADORA|LOCATÁRIO|LOCATARIA|PROPRIETÁRIO|PROPRIETÁRIA|MOTORISTA|EMPRESA|CONTRATANTE|TESTEMUNHA|COMODANTE|COMODATÁRIO|REPRESENTANTE)(?:\s+LEGAL)?$/iu',
                $text
            );
    }

    private function signatureGrid(array $names): string
    {
        $rows = [];

        foreach (array_chunk($names, 2) as $pair) {
            $cells = '';

            foreach ($pair as $name) {
                $cells .=
                    '<td>'.
                    '<div class="contract-signature-line"></div>'.
                    '<div class="contract-signature-name">'.
                    $this->esc($name).
                    '</div>'.
                    '</td>';
            }

            if (count($pair) === 1) {
                $cells .= '<td></td>';
            }

            $rows[] = '<tr>'.$cells.'</tr>';
        }

        return
            '<table class="contract-signatures">'.
            '<tbody>'.
            implode('', $rows).
            '</tbody>'.
            '</table>';
    }

    private function esc(string $value): string
    {
        return htmlspecialchars(
            $value,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );
    }
}
