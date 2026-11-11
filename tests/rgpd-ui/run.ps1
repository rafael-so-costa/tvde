$ErrorActionPreference = "Stop"

$root = (& git rev-parse --show-toplevel)

if ($LASTEXITCODE -ne 0 -or -not $root) {
    throw "Repositorio FrotaPro nao encontrado."
}

Set-Location -LiteralPath $root.Trim()

$toolDir = Join-Path $env:LOCALAPPDATA `
    "FrotaPro\rgpd-playwright"

$package = Join-Path $toolDir `
    "node_modules\playwright\package.json"

if (-not (Test-Path -LiteralPath $package)) {
    throw (
        "Playwright nao encontrado. Instale-o " +
        "fora do repositorio antes de executar os testes."
    )
}

$previous = [Environment]::GetEnvironmentVariable(
    "FROTAPRO_4T_TOOL_DIR",
    "Process"
)

try {
    [Environment]::SetEnvironmentVariable(
        "FROTAPRO_4T_TOOL_DIR",
        $toolDir,
        "Process"
    )

    & node "tests/rgpd-ui/runner.mjs"

    if ($LASTEXITCODE -ne 0) {
        throw "Os testes E2E RGPD falharam."
    }

    Write-Host ""
    Write-Host "[OK] Testes E2E RGPD aprovados." `
        -ForegroundColor Green
}
finally {
    [Environment]::SetEnvironmentVariable(
        "FROTAPRO_4T_TOOL_DIR",
        $previous,
        "Process"
    )
}