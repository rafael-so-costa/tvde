<?php

use App\Services\TemplateTextAnalyzerService;

function templateAnalyzerCorpusRoot(): string
{
    return dirname(
        __DIR__,
        2
    );
}

dataset(
    'template text analyzer corpus',
    function () {
        $root = dirname(
            __DIR__,
            2
        );

        $manifest = require $root .
            '/tests/Fixtures/templates/text-analyzer/_manifest.php';

        foreach (
            $manifest
            as $file =>
            $expectations
        ) {
            yield $file => [
                $file,
                $expectations,
            ];
        }
    }
);

test(
    'analisador respeita corpus de documentos',
    function (
        string $file,
        array $expectations
    ) {
        $path =
            templateAnalyzerCorpusRoot() .
            '/tests/Fixtures/templates/text-analyzer/' .
            $file;

        expect(
            file_exists(
                $path
            )
        )->toBeTrue();

        $content =
            file_get_contents(
                $path
            );

        expect(
            $content
        )
            ->not
            ->toBeFalse();

        /** @var TemplateTextAnalyzerService $analyzer */
        $analyzer =
            app(
                TemplateTextAnalyzerService::class
            );

        $result =
            $analyzer->analyze(
                $content
            );

        $fields =
            collect(
                $result[
                    'campos_detectados'
                ]
            )
                ->pluck(
                    'name'
                )
                ->all();

        foreach (
            $expectations[
                'expected'
            ] ?? []
            as $field
        ) {
            expect(
                $fields
            )->toContain(
                $field
            );
        }

        foreach (
            $expectations[
                'forbidden'
            ] ?? []
            as $field
        ) {
            expect(
                $fields
            )->not->toContain(
                $field
            );
        }

        $warningCodes =
            collect(
                $result[
                    'warnings'
                ]
            )
                ->pluck(
                    'code'
                )
                ->all();

        foreach (
            $expectations[
                'warnings'
            ] ?? []
            as $warning
        ) {
            expect(
                $warningCodes
            )->toContain(
                $warning
            );
        }

        foreach (
            $expectations[
                'forbidden_warnings'
            ] ?? []
            as $warning
        ) {
            expect(
                $warningCodes
            )->not->toContain(
                $warning
            );
        }

        foreach (
            $expectations[
                'minimum_values'
            ] ?? []
            as $field =>
            $minimum
        ) {
            $values =
                data_get(
                    $result,
                    "campos_mapeados.{$field}.valores_detectados",
                    []
                );

            expect(
                count(
                    $values
                )
            )->toBeGreaterThanOrEqual(
                $minimum
            );
        }

        foreach (
            $expectations[
                'exact_values'
            ] ?? []
            as $field =>
            $expectedValues
        ) {
            $values =
                array_values(
                    array_unique(
                        data_get(
                            $result,
                            "campos_mapeados.{$field}.valores_detectados",
                            []
                        )
                    )
                );

            $expectedValues =
                array_values(
                    array_unique(
                        $expectedValues
                    )
                );

            sort(
                $values
            );

            sort(
                $expectedValues
            );

            expect(
                $values
            )->toBe(
                $expectedValues
            );
        }

        foreach (
            $expectations[
                'contains'
            ] ?? []
            as $fragment
        ) {
            expect(
                $result[
                    'conteudo_parametrizado'
                ]
            )->toContain(
                $fragment
            );
        }

        foreach (
            $expectations[
                'forbidden_contains'
            ] ?? []
            as $fragment
        ) {
            expect(
                $result[
                    'conteudo_parametrizado'
                ]
            )->not->toContain(
                $fragment
            );
        }

        expect(
            $result[
                'conteudo_parametrizado'
            ]
        )
            ->toBeString()
            ->not
            ->toBe('');
    }
)->with(
    'template text analyzer corpus'
);
