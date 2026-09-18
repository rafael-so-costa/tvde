<?php

namespace App\Services;

use Illuminate\Support\Str;

class TemplateFieldDetector
{
    public function detect(string $content): array
    {
        $content = $this->normalizeContent(
            $content
        );

        $patterns = [
            '/\{\{([A-Z][A-Z0-9_]*)\}\}/u',
            '/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/u',
            '/\{ \{ ([A-Z][A-Z0-9_ ]*) \} \}/u',
            '/\[\[([A-Z][A-Z0-9_]*)\]\]/u',
            '/<<([A-Z][A-Z0-9_]*)>>/u',
            '/__([A-Z][A-Z0-9_]*)__/u',
            '/\(([A-Z][A-Z0-9_ ]{2,})\)/u',
        ];

        $fields = [];
        $seen = [];

        foreach ($patterns as $index => $pattern) {
            preg_match_all(
                $pattern,
                $content,
                $matches
            );

            foreach ($matches[1] ?? [] as $rawName) {
                $name = mb_strtoupper(
                    preg_replace(
                        '/\s+/u',
                        '_',
                        trim($rawName)
                    ) ?? ''
                );

                if (
                    $index === 6 &&
                    !str_contains($name, '_') &&
                    !str_starts_with(
                        $name,
                        'DATA'
                    )
                ) {
                    continue;
                }

                if (
                    mb_strlen($name) < 2 ||
                    isset($seen[$name])
                ) {
                    continue;
                }

                $seen[$name] = true;

                $fields[] = [
                    'id' => Str::uuid()
                        ->toString(),
                    'name' => $name,
                    'label' =>
                        $this->formatLabel(
                            $name
                        ),
                    'type' =>
                        $this->inferType(
                            $name
                        ),
                    'required' =>
                        $this->isRequired(
                            $name
                        ),
                ];
            }
        }

        return $fields;
    }

    private function normalizeContent(
        string $content
    ): string {
        $content = str_replace(
            ["\r\n", "\r"],
            "\n",
            $content
        );

        $content = preg_replace(
            '/\{\s*\{/u',
            '{{',
            $content
        ) ?? $content;

        $content = preg_replace(
            '/\}\s*\}/u',
            '}}',
            $content
        ) ?? $content;

        return preg_replace(
            '/[\x{200B}-\x{200D}\x{FEFF}]/u',
            '',
            $content
        ) ?? $content;
    }

    private function formatLabel(
        string $name
    ): string {
        return collect(
            explode('_', $name)
        )
            ->map(
                fn (string $word) =>
                    ucfirst(
                        mb_strtolower(
                            $word
                        )
                    )
            )
            ->implode(' ');
    }

    private function inferType(
        string $name
    ): string {
        $name = mb_strtolower($name);

        if (
            str_contains($name, 'data') ||
            str_contains($name, 'date')
        ) {
            return 'date';
        }

        if (
            str_contains($name, 'valor') ||
            str_contains($name, 'preco') ||
            str_contains(
                $name,
                'montante'
            )
        ) {
            return 'currency';
        }

        if (
            str_contains($name, 'cpf') ||
            str_contains($name, 'cnpj') ||
            str_contains($name, 'nif')
        ) {
            return 'cpf_cnpj';
        }

        if (
            str_contains(
                $name,
                'email'
            )
        ) {
            return 'email';
        }

        if (
            str_contains(
                $name,
                'telefone'
            ) ||
            str_contains(
                $name,
                'telemovel'
            ) ||
            str_contains(
                $name,
                'phone'
            )
        ) {
            return 'phone';
        }

        if (
            str_contains(
                $name,
                'numero'
            ) ||
            str_contains(
                $name,
                'quantidade'
            ) ||
            str_contains(
                $name,
                'qtd'
            )
        ) {
            return 'number';
        }

        return 'text';
    }

    private function isRequired(
        string $name
    ): bool {
        foreach (
            [
                'NOME',
                'NIF',
                'DATA',
                'VALOR',
                'ENDERECO',
                'MATRICULA',
            ]
            as $token
        ) {
            if (
                str_contains(
                    $name,
                    $token
                )
            ) {
                return true;
            }
        }

        return false;
    }
}
