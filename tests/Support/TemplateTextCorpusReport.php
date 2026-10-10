<?php

use App\Services\TemplateTextAnalyzerService;
use Illuminate\Contracts\Console\Kernel;

$root = dirname(
    __DIR__,
    2
);

require $root .
    '/vendor/autoload.php';

$app = require $root .
    '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(
    Kernel::class
);

$kernel->bootstrap();

/** @var TemplateTextAnalyzerService $analyzer */
$analyzer = $app->make(
    TemplateTextAnalyzerService::class
);

$base =
    $root .
    '/tests/Fixtures/templates/text-analyzer';

$manifest =
    require $base .
        '/_manifest.php';

echo PHP_EOL;
echo 'Template Text Analyzer - Corpus Report';
echo PHP_EOL;

echo str_repeat(
    '=',
    78
);

echo PHP_EOL .
    PHP_EOL;

$total = 0;
$passed = 0;
$failed = 0;

foreach (
    $manifest
    as $file =>
    $expectations
) {
    $total++;

    $content =
        file_get_contents(
            $base .
            '/' .
            $file
        );

    if (
        $content === false
    ) {
        $failed++;

        echo '[FAIL] ' .
            $file .
            PHP_EOL;

        echo '       Não foi possível ler o ficheiro.' .
            PHP_EOL .
            PHP_EOL;

        continue;
    }

    $result =
        $analyzer->analyze(
            $content
        );

    $fields =
        collect(
            $result[
                'campos_detectados'
            ] ?? []
        )
            ->pluck(
                'name'
            )
            ->all();

    $warningCodes =
        collect(
            $result[
                'warnings'
            ] ?? []
        )
            ->pluck(
                'code'
            )
            ->all();

    /*
     * Campos obrigatórios que deveriam ter sido encontrados.
     */
    $missing =
        array_values(
            array_diff(
                $expectations[
                    'expected'
                ] ?? [],
                $fields
            )
        );

    /*
     * Campos que não deveriam ter sido encontrados.
     */
    $forbiddenFound =
        array_values(
            array_intersect(
                $expectations[
                    'forbidden'
                ] ?? [],
                $fields
            )
        );

    /*
     * Avisos que deveriam existir.
     */
    $missingWarnings =
        array_values(
            array_diff(
                $expectations[
                    'warnings'
                ] ?? [],
                $warningCodes
            )
        );

    /*
     * Avisos que não deveriam existir.
     */
    $forbiddenWarningsFound =
        array_values(
            array_intersect(
                $expectations[
                    'forbidden_warnings'
                ] ?? [],
                $warningCodes
            )
        );

    /*
     * Quantidade mínima de valores reconhecidos para determinado campo.
     */
    $valueFailures = [];

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

        if (
            !is_array(
                $values
            )
        ) {
            $values = [];
        }

        if (
            count(
                $values
            ) < $minimum
        ) {
            $valueFailures[] =
                $field .
                ' ' .
                count(
                    $values
                ) .
                '/' .
                $minimum;
        }
    }

    /*
     * Valores exatos esperados.
     *
     * Útil para impedir situações em que o campo certo é encontrado,
     * mas recebe também valores pertencentes a outro contexto.
     *
     * Exemplo:
     * PROPRIETARIO_NIF deve conter apenas o NIF do proprietário,
     * e não também o NIF do motorista.
     */
    $exactValueFailures = [];

    foreach (
        $expectations[
            'exact_values'
        ] ?? []
        as $field =>
        $expectedValues
    ) {
        $values =
            data_get(
                $result,
                "campos_mapeados.{$field}.valores_detectados",
                []
            );

        if (
            !is_array(
                $values
            )
        ) {
            $values = [];
        }

        $values =
            array_values(
                array_unique(
                    $values
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

        if (
            $values !==
            $expectedValues
        ) {
            $exactValueFailures[] =
                $field .
                ' [' .
                implode(
                    ', ',
                    $values
                ) .
                '] esperado [' .
                implode(
                    ', ',
                    $expectedValues
                ) .
                ']';
        }
    }

    /*
     * Fragmentos que obrigatoriamente devem existir no preview
     * parametrizado.
     */
    $missingFragments = [];

    foreach (
        $expectations[
            'contains'
        ] ?? []
        as $fragment
    ) {
        if (
            !str_contains(
                $result[
                    'conteudo_parametrizado'
                ] ?? '',
                $fragment
            )
        ) {
            $missingFragments[] =
                $fragment;
        }
    }

    /*
     * Fragmentos que nunca devem existir no preview.
     *
     * Isto permite detectar corrupção textual mesmo quando
     * o conjunto de campos aparentemente está correto.
     */
    $forbiddenFragmentsFound = [];

    foreach (
        $expectations[
            'forbidden_contains'
        ] ?? []
        as $fragment
    ) {
        if (
            str_contains(
                $result[
                    'conteudo_parametrizado'
                ] ?? '',
                $fragment
            )
        ) {
            $forbiddenFragmentsFound[] =
                $fragment;
        }
    }

    $ok =
        $missing === [] &&
        $forbiddenFound === [] &&
        $missingWarnings === [] &&
        $forbiddenWarningsFound === [] &&
        $valueFailures === [] &&
        $exactValueFailures === [] &&
        $missingFragments === [] &&
        $forbiddenFragmentsFound === [];

    if ($ok) {
        $passed++;
    } else {
        $failed++;
    }

    echo $ok
        ? '[PASS] '
        : '[FAIL] ';

    echo $file;
    echo PHP_EOL;

    echo '       Campos detectados: ' .
        count(
            $fields
        );

    echo ' | Valores: ' .
        (
            $result[
                'stats'
            ][
                'valores_detectados'
            ] ?? 0
        );

    echo ' | Avisos: ' .
        count(
            $warningCodes
        );

    echo PHP_EOL;

    if (
        $missing !== []
    ) {
        echo '       Faltaram: ' .
            implode(
                ', ',
                $missing
            ) .
            PHP_EOL;
    }

    if (
        $forbiddenFound !== []
    ) {
        echo '       Falsos positivos: ' .
            implode(
                ', ',
                $forbiddenFound
            ) .
            PHP_EOL;
    }

    if (
        $missingWarnings !== []
    ) {
        echo '       Avisos esperados ausentes: ' .
            implode(
                ', ',
                $missingWarnings
            ) .
            PHP_EOL;
    }

    if (
        $forbiddenWarningsFound !== []
    ) {
        echo '       Avisos indevidos: ' .
            implode(
                ', ',
                $forbiddenWarningsFound
            ) .
            PHP_EOL;
    }

    if (
        $valueFailures !== []
    ) {
        echo '       Valores insuficientes: ' .
            implode(
                ', ',
                $valueFailures
            ) .
            PHP_EOL;
    }

    if (
        $exactValueFailures !== []
    ) {
        echo '       Valores incorretos: ' .
            implode(
                ' | ',
                $exactValueFailures
            ) .
            PHP_EOL;
    }

    if (
        $missingFragments !== []
    ) {
        echo '       Preview não contém: ' .
            implode(
                ' | ',
                $missingFragments
            ) .
            PHP_EOL;
    }

    if (
        $forbiddenFragmentsFound !== []
    ) {
        echo '       Preview contém fragmentos indevidos: ' .
            implode(
                ' | ',
                $forbiddenFragmentsFound
            ) .
            PHP_EOL;
    }

    if (
        $warningCodes !== []
    ) {
        echo '       Avisos encontrados: ' .
            implode(
                ', ',
                array_unique(
                    $warningCodes
                )
            ) .
            PHP_EOL;
    }

    echo PHP_EOL;
}

echo str_repeat(
    '-',
    78
);

echo PHP_EOL;

echo "Corpus: {$total}";
echo " | PASS: {$passed}";
echo " | FAIL: {$failed}";

echo PHP_EOL .
    PHP_EOL;

exit(
    $failed > 0
        ? 1
        : 0
);
