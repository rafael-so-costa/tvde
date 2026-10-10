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

$manifest = require $base .
    '/_manifest.php';

echo PHP_EOL;
echo 'Template Text Analyzer - Corpus Report';
echo PHP_EOL;
echo str_repeat(
    '=',
    78
);
echo PHP_EOL . PHP_EOL;

$total = 0;
$passed = 0;
$failed = 0;

foreach (
    $manifest
    as $file => $expectations
) {
    $total++;

    $content = file_get_contents(
        $base .
        '/' .
        $file
    );

    $result = $analyzer->analyze(
        $content
    );

    $fields = collect(
        $result['campos_detectados']
    )
        ->pluck(
            'name'
        )
        ->all();

    $warningCodes = collect(
        $result['warnings']
    )
        ->pluck(
            'code'
        )
        ->all();

    $missing = array_values(
        array_diff(
            $expectations['expected'] ?? [],
            $fields
        )
    );

    $forbiddenFound = array_values(
        array_intersect(
            $expectations['forbidden'] ?? [],
            $fields
        )
    );

    $missingWarnings = array_values(
        array_diff(
            $expectations['warnings'] ?? [],
            $warningCodes
        )
    );

    $valueFailures = [];

    foreach (
        $expectations['minimum_values'] ?? []
        as $field => $minimum
    ) {
        $values = data_get(
            $result,
            "campos_mapeados.{$field}.valores_detectados",
            []
        );

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

    $ok =
        $missing === [] &&
        $forbiddenFound === [] &&
        $missingWarnings === [] &&
        $valueFailures === [];

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
            $result['stats']['valores_detectados']
            ?? 0
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
        $valueFailures !== []
    ) {
        echo '       Valores múltiplos insuficientes: ' .
            implode(
                ', ',
                $valueFailures
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
echo PHP_EOL . PHP_EOL;

exit(
    $failed > 0
        ? 1
        : 0
);