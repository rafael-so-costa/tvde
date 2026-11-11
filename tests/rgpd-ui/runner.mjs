import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const origin = "http://127.0.0.1:5179";

const toolDir = process.env.FROTAPRO_4T_TOOL_DIR;

if (!toolDir) {
    throw new Error("FROTAPRO_4T_TOOL_DIR em falta");
}

const require = createRequire(import.meta.url);

const { chromium } = require(
    path.join(toolDir, "node_modules", "playwright")
);

const screenshots = path.join(
    root,
    "storage",
    "app",
    "preview-audit",
    "rgpd-ui-4t-" +
        new Date().toISOString().replace(/[:.]/g, "-")
);

fs.mkdirSync(screenshots, { recursive: true });

let vite;
let browser;
let logs = "";

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

async function waitForVite() {
    for (let i = 0; i < 160; i++) {
        if (vite.exitCode !== null) {
            throw new Error(
                "Vite encerrou: " + logs.slice(-2500)
            );
        }

        try {
            const response = await fetch(
                origin + "/tests/rgpd-ui/index.html"
            );

            const html = await response.text();

            if (
                response.ok &&
                html.includes(
                    "FrotaPro RGPD — Ensaio isolado"
                )
            ) {
                return;
            }
        } catch {
            // Vite ainda esta a iniciar.
        }

        await sleep(250);
    }

    throw new Error(
        "Vite nao respondeu: " + logs.slice(-2500)
    );
}

function fakeType(invalid) {
    return {
        id: "rgpd-fixture",
        tenant_id: "tenant-fixture",
        nome: "RGPD",
        slug: "rgpd",
        codigo: "rgpd",
        descricao: "Simulacao sem persistencia",
        template_id: "template-fixture",
        checklist_process_template_id: "workflow-fixture",

        entidades: {
            empresa: true,
            motorista: Boolean(invalid),
            proprietario: false,
            veiculo: false,
        },

        campos_configuracao: [
            [
                "RGPD_TITULAR_TIPO",
                ["motorista", "proprietario", "colaborador", "outro"],
            ],
            [
                "RGPD_DECISAO_IMAGEM",
                ["autorizo", "nao_autorizo"],
            ],
            [
                "RGPD_DECISAO_VOZ",
                ["autorizo", "nao_autorizo"],
            ],
            [
                "RGPD_DECISAO_GEO",
                ["autorizo", "nao_autorizo", "nao_aplicavel"],
            ],
            [
                "RGPD_DECISAO_SENSIVEIS",
                ["autorizo", "nao_autorizo", "nao_aplicavel"],
            ],
        ].map(([campo, opcoes]) => ({
            campo,
            opcoes,
            origem: "manual",
            tipo: "select",
            obrigatorio: true,
        })),

        assinaturas_configuracao: invalid
            ? [
                {
                    placeholder: "ASSINATURA_MOTORISTA",
                    obrigatoria: true,
                    modos: ["presencial", "remota"],
                },
                {
                    placeholder: "ASSINATURA_EMPRESA",
                    obrigatoria: true,
                    modos: ["presencial", "remota"],
                },
            ]
            : [
                {
                    placeholder: "ASSINATURA_TITULAR",
                    obrigatoria: true,
                    modos: ["presencial", "remota"],
                },
            ],

        configuracao: {
            associar_motorista_veiculo: false,
        },

        ativo: true,
        mostrar_menu: true,
        ordem: 1,
        cobranca_habilitada: false,

        template: {
            id: "template-fixture",
            nome: "Informação sobre o Tratamento de Dados Pessoais (RGPD)",
            tipo_arquivo: "html",
            ativo: true,
        },

        checklist_process_template: {
            id: "workflow-fixture",
            codigo: "frotapro_rgpd_informacao_autorizacoes",
            nome: "RGPD — Cinco etapas",
            ativo: true,
            versao: 1,
        },
    };
}

async function runScenario(invalid, viewport, prefix) {
    const context = await browser.newContext({
        viewport,
        locale: "pt-PT",
        serviceWorkers: "block",
    });

    let submitted = null;
    const errors = [];

    /*
     * Bloqueio total de destinos externos.
     *
     * Apenas o servidor Vite isolado pode receber
     * pedidos HTTP. As APIs sao sempre ficticias.
     */
    await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());

        if (url.origin !== origin) {
            return route.abort("blockedbyclient");
        }

        const p = url.pathname;

        const answer = (json, status = 200) =>
            route.fulfill({ status, json });

        if (p === "/api/user") {
            return answer({
                user: {
                    id: "user-fixture",
                    name: "Operador Teste",
                    email: "operador@example.invalid",
                    ativo: true,
                    tenants: [],
                    roles: [],
                    super_admin: false,
                },
            });
        }

        if (p === "/api/tenant-options") {
            return answer({
                data: [
                    {
                        id: "tenant-fixture",
                        nome: "Tenant Fictício",
                        slug: "teste",
                        ativo: true,
                    },
                ],
            });
        }

        if (
            p === "/api/tenant-context" &&
            request.method() === "GET"
        ) {
            return answer({
                tenant_id: "tenant-fixture",
            });
        }

        if (
            p === "/api/tipos-contrato" &&
            request.method() === "GET"
        ) {
            return answer({
                data: [fakeType(invalid)],
            });
        }

        if (p === "/api/funcionarios") {
            return answer({ data: [] });
        }

        if (
            p === "/api/contratos" &&
            request.method() === "POST"
        ) {
            submitted = request.postDataJSON();

            return answer(
                {
                    data: {
                        id: "contrato-simulado",
                        status: "enviado",
                    },
                },
                201
            );
        }

        if (
            p.startsWith("/api/") ||
            p.startsWith("/sanctum/")
        ) {
            return route.abort("blockedbyclient");
        }

        return route.continue();
    });

    const page = await context.newPage();

    page.on("pageerror", (error) => {
        errors.push(error.message);
    });

    const next = () =>
        page.getByRole("button", { name: "Continuar" }).click();

    const back = () =>
        page.getByRole("button", { name: "Voltar" }).click();

    try {
        await page.goto(
            origin +
            "/tests/rgpd-ui/index.html?scenario=" +
            (invalid ? "invalid" : "valid")
        );

        await page
            .getByRole("heading", { name: "Titular dos dados" })
            .waitFor({ timeout: 20000 });

        assert.equal(
            await page
                .getByRole("heading", {
                    name: "Condições",
                    exact: true,
                })
                .count(),
            0
        );

        // As quatro autorizacoes devem estar visiveis.

        for (const label of [
            /Utilização promocional da imagem/,
            /Utilização promocional da voz/,
            /Localização para finalidade facultativa/,
            /Dados de categorias especiais/,
        ]) {
            assert.equal(
                await page.getByLabel(label).count(),
                1
            );
        }

        // Cenario do tipo existente mal configurado.

        if (invalid) {
            await page
                .getByText("Configuração RGPD incompleta")
                .waitFor();

            await next();

            assert.equal(
                await page
                    .getByRole("heading", {
                        name: "Titular dos dados",
                    })
                    .isVisible(),
                true
            );

            await page.screenshot({
                path: path.join(
                    screenshots,
                    prefix + "-configuracao-invalida.png"
                ),
            });

            console.log(
                "[OK] Tipo RGPD invalido bloqueado."
            );

            return;
        }

        // Preencher dados reais da interface com
        // valores inteiramente ficticios.

        await page
            .getByLabel(/Qualidade do titular/)
            .selectOption("motorista");

        await page
            .getByLabel(/^Motorista/)
            .selectOption("motorista-fixture");

        await page
            .getByLabel(/Utilização promocional da imagem/)
            .selectOption("nao_autorizo");

        await page
            .getByLabel(/Utilização promocional da voz/)
            .selectOption("autorizo");

        await page
            .getByLabel(/Localização para finalidade facultativa/)
            .selectOption("nao_aplicavel");

        await page
            .getByLabel(/Dados de categorias especiais/)
            .selectOption("nao_autorizo");

        await page.screenshot({
            path: path.join(
                screenshots,
                prefix + "-dados.png"
            ),
        });

        await next();

        await page
            .getByRole("heading", { name: "Assinaturas" })
            .waitFor();

        // Simular assinatura no canvas real.

        async function draw() {
            const canvas = page.locator("canvas").first();

            await canvas.scrollIntoViewIfNeeded();

            const box = await canvas.boundingBox();

            assert.ok(
                box,
                "Canvas de assinatura nao visivel."
            );

            await page.mouse.move(
                box.x + 24,
                box.y + 45
            );

            await page.mouse.down();

            await page.mouse.move(
                box.x + 100,
                box.y + 90,
                { steps: 8 }
            );

            await page.mouse.move(
                box.x + 170,
                box.y + 50,
                { steps: 8 }
            );

            await page.mouse.up();
        }

        await draw();
        await next();

        await page
            .getByRole("heading", { name: "Rever contrato" })
            .waitFor();

        assert.equal(
            await page
                .getByRole("heading", {
                    name: "Autorizações específicas (RGPD)",
                })
                .isVisible(),
            true
        );

        assert.equal(
            await page
                .getByRole("heading", {
                    name: "Condições",
                    exact: true,
                })
                .count(),
            0
        );

        await page.screenshot({
            path: path.join(
                screenshots,
                prefix + "-revisao.png"
            ),
        });

        // Voltar aos dados depois de assinar.

        await back();
        await back();

        await page
            .getByLabel(/Utilização promocional da imagem/)
            .selectOption("autorizo");

        await next();

        // A assinatura antiga deve ser anulada.

        await page
            .getByText("É necessária uma nova assinatura")
            .waitFor();

        await page.screenshot({
            path: path.join(
                screenshots,
                prefix + "-assinatura-invalidada.png"
            ),
        });

        // Impedir avancar com assinatura antiga.

        await next();

        await page
            .getByText(/Preencha a assinatura ASSINATURA_TITULAR/)
            .waitFor();

        // Recolher nova assinatura.

        await draw();
        await next();

        await page
            .getByRole("heading", { name: "Rever contrato" })
            .waitFor();

        // A criacao abaixo usa exclusivamente a API simulada.

        await page
            .getByRole("button", { name: "Criar contrato" })
            .click();

        await page.waitForFunction(
            () => Boolean(window.__RGPD_FAKE_SUCCESS__)
        );

        assert.ok(
            submitted,
            "Pedido simulado nao recebido."
        );

        const fields = submitted.campos_preenchidos;

        assert.equal(
            fields.RGPD_DECISAO_IMAGEM,
            "autorizo"
        );

        assert.equal(
            fields.RGPD_DECISAO_VOZ,
            "autorizo"
        );

        assert.equal(
            fields.RGPD_DECISAO_GEO,
            "nao_aplicavel"
        );

        assert.equal(
            fields.RGPD_DECISAO_SENSIVEIS,
            "nao_autorizo"
        );

        assert.equal(
            submitted.assinaturas.length,
            1
        );

        assert.equal(
            submitted.assinaturas[0].placeholder,
            "ASSINATURA_TITULAR"
        );

        assert.match(
            submitted.assinaturas[0].assinatura_url,
            /^data:image\/png;base64,/
        );

        console.log(
            "[OK] " + prefix +
            ": dados, 4 autorizacoes, assinatura," +
            " invalidacao, revisao e envio simulado."
        );

    } catch (error) {
        await page.screenshot({
            path: path.join(
                screenshots,
                prefix + "-ERRO.png"
            ),
        }).catch(() => {});

        throw error;

    } finally {
        await context.close();

        if (errors.length > 0) {
            throw new Error(
                "Erro JavaScript no navegador: " +
                errors.join(" | ")
            );
        }
    }
}

try {
    // Servidor Vite independente do Laravel.

    const viteCli = path.join(
        root,
        "node_modules",
        "vite",
        "bin",
        "vite.js"
    );

    if (!fs.existsSync(viteCli)) {
        throw new Error("Vite nao instalado.");
    }

    vite = spawn(
        process.execPath,
        [
            viteCli,
            "--config",
            "tests/rgpd-ui/vite.config.mjs",
            "--host",
            "127.0.0.1",
            "--port",
            "5179",
            "--strictPort",
        ],
        {
            cwd: root,

            env: {
                ...process.env,

                DB_CONNECTION: "sqlite",
                DB_DATABASE: ":memory:",
                DB_URL: "",
                DATABASE_URL: "",
                DB_HOST: "invalid.invalid",
            },

            stdio: ["ignore", "pipe", "pipe"],
        }
    );

    vite.stdout.on("data", (data) => {
        logs = (logs + String(data)).slice(-9000);
    });

    vite.stderr.on("data", (data) => {
        logs = (logs + String(data)).slice(-9000);
    });

    await waitForVite();

    // Usar Chrome ou Edge instalado.
    // Fallback para Chromium do Playwright.

    let lastLaunchError = "";

    for (const options of [
        { channel: "chrome", headless: true },
        { channel: "msedge", headless: true },
        { headless: true },
    ]) {
        try {
            browser = await chromium.launch(options);
            break;

        } catch (error) {
            lastLaunchError = String(error).slice(0,900);
        }
    }

    if (!browser) {
        throw new Error(
            "Chrome, Edge ou Chromium indisponivel: " +
            lastLaunchError +
            ". Instale o Chromium via Playwright."
        );
    }

    // 3 cenarios reais de navegador.

    await runScenario(
        false,
        { width: 1365, height: 900 },
        "desktop"
    );

    await runScenario(
        false,
        { width: 390, height: 844 },
        "mobile"
    );

    await runScenario(
        true,
        { width: 1365, height: 900 },
        "legado"
    );

    fs.writeFileSync(
        path.join(screenshots, "RESULTADO.txt"),
        [
            "FROTAPRO - RGPD UI 4R.14B.4T",
            "3 cenarios aprovados.",
            "Desktop, mobile e configuracao invalida.",
            "Nenhum backend ou MySQL utilizado.",
            "",
        ].join("\n")
    );

    console.log("");
    console.log("[OK] 3 CENARIOS E2E APROVADOS");
    console.log("Capturas: " + screenshots);

} catch (error) {
    console.error("[FALHA] " + String(error));
    console.error(
        "Capturas, quando disponiveis: " +
        screenshots
    );

    process.exitCode = 1;

} finally {
    if (browser) {
        await browser.close();
    }

    if (vite && vite.exitCode === null) {
        vite.kill();
    }
}