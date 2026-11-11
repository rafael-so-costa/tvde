import test from "node:test";
import assert from "node:assert/strict";

import {
    isRgpdConfigurationCode,
    proposeRgpdConfiguration,
} from "../resources/js/lib/rgpdTypeConfig.ts";

function fixture() {
    return {
        nome: "RGPD",
        template_id: "template-original",
        checklist_process_template_id: "workflow-original",
        campos_configuracao: [
            { campo: "RGPD_DECISAO_IMAGEM" },
        ],

        configuracao_extra: "preservar",

        entidades: {
            empresa: true,
            motorista: true,
            proprietario: false,
            veiculo: false,
        },

        associar_motorista_veiculo: true,

        assinaturas: Object.fromEntries(
            [
                "ASSINATURA_MOTORISTA",
                "ASSINATURA_PROPRIETARIO",
                "ASSINATURA_EMPRESA",
                "ASSINATURA_TESTEMUNHA",
                "ASSINATURA_TITULAR",
            ].map((key) => [
                key,
                {
                    enabled: [
                        "ASSINATURA_MOTORISTA",
                        "ASSINATURA_EMPRESA",
                    ].includes(key),
                    obrigatoria: true,
                    presencial: true,
                    remota: true,
                },
            ])
        ),
    };
}

test("reconhece apenas codigos RGPD suportados", () => {
    assert.equal(isRgpdConfigurationCode("rgpd"), true);
    assert.equal(
        isRgpdConfigurationCode("rgpd_informacao_autorizacoes"),
        true
    );
    assert.equal(
        isRgpdConfigurationCode("prestacao_de_servicos"),
        false
    );
});

test("substitui duas assinaturas pela do titular", () => {
    const result = proposeRgpdConfiguration(fixture());

    const enabled = Object.entries(result.assinaturas)
        .filter(([, config]) => config.enabled)
        .map(([key]) => key);

    assert.deepEqual(enabled, ["ASSINATURA_TITULAR"]);

    assert.equal(
        result.assinaturas.ASSINATURA_TITULAR.obrigatoria,
        true
    );

    assert.equal(
        result.assinaturas.ASSINATURA_TITULAR.presencial,
        true
    );

    assert.equal(
        result.assinaturas.ASSINATURA_TITULAR.remota,
        true
    );
});

test("corrige entidades e associacao", () => {
    const result = proposeRgpdConfiguration(fixture());

    assert.deepEqual(result.entidades, {
        empresa: true,
        motorista: false,
        proprietario: false,
        veiculo: false,
    });

    assert.equal(result.associar_motorista_veiculo, false);
});

test("preserva template workflow e campos", () => {
    const original = fixture();
    const result = proposeRgpdConfiguration(original);

    assert.equal(result.template_id, original.template_id);
    assert.equal(
        result.checklist_process_template_id,
        original.checklist_process_template_id
    );

    assert.deepEqual(
        result.campos_configuracao,
        original.campos_configuracao
    );

    assert.equal(result.configuracao_extra, "preservar");
});

test("nao modifica o estado original", () => {
    const original = fixture();
    const before = structuredClone(original);

    proposeRgpdConfiguration(original);

    assert.deepEqual(original, before);
});

test("pode ser aplicado duas vezes sem alterar o resultado", () => {
    const once = proposeRgpdConfiguration(fixture());
    const twice = proposeRgpdConfiguration(once);

    assert.deepEqual(twice, once);
});