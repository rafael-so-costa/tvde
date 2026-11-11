import test from "node:test";
import assert from "node:assert/strict";

import {
    rgpdRelevantChange,
    invalidateRgpdCapturedSignature,
} from "../resources/js/components/contratos/wizard/rgpdSignatureIntegrity.ts";

function signed() {
    return {
        ASSINATURA_TITULAR: {
            enabled: true,
            modo: "presencial",
            assinatura_url: "data:image/png;base64,YWJj",
            signatario_nome: "Pessoa Teste",
            signatario_email: "",
        },

        ASSINATURA_EMPRESA: {
            enabled: false,
            modo: "remota",
            assinatura_url: "",
            signatario_nome: "",
            signatario_email: "",
        },
    };
}

test(
    "alterar qualquer autorizacao invalida a assinatura",
    () => {
        for (const decision of [
            "RGPD_DECISAO_IMAGEM",
            "RGPD_DECISAO_VOZ",
            "RGPD_DECISAO_GEO",
            "RGPD_DECISAO_SENSIVEIS",
        ]) {
            assert.equal(
                rgpdRelevantChange(
                    true,
                    decision,
                    "autorizo",
                    "nao_autorizo",
                ),
                true,
            );
        }
    },
);

test(
    "alterar empresa ou titular invalida a assinatura",
    () => {
        for (const field of [
            "empresa_id",
            "motorista_id",
            "proprietario_id",
            "RGPD_TITULAR_TIPO",
            "RGPD_TITULAR_ID",
            "RGPD_OUTRO_NIF",
            "RGPD_OUTRO_NOME",
            "RGPD_OUTRO_CONTACTO",
        ]) {
            assert.equal(
                rgpdRelevantChange(
                    true,
                    field,
                    "anterior",
                    "novo",
                ),
                true,
            );
        }
    },
);

test(
    "valor repetido nao invalida assinatura",
    () => {
        assert.equal(
            rgpdRelevantChange(
                true,
                "RGPD_DECISAO_VOZ",
                "autorizo",
                "autorizo",
            ),
            false,
        );

        assert.equal(
            rgpdRelevantChange(
                true,
                "RGPD_TITULAR_ID",
                null,
                "",
            ),
            false,
        );
    },
);

test(
    "campos financeiros comuns nao invalidam RGPD",
    () => {
        assert.equal(
            rgpdRelevantChange(
                true,
                "data_inicio",
                "2026-11-11",
                "2026-11-12",
            ),
            false,
        );
    },
);

test(
    "outros tipos de contrato preservam assinatura",
    () => {
        assert.equal(
            rgpdRelevantChange(
                false,
                "RGPD_DECISAO_IMAGEM",
                "autorizo",
                "nao_autorizo",
            ),
            false,
        );

        assert.equal(
            rgpdRelevantChange(
                false,
                "empresa_id",
                "1",
                "2",
            ),
            false,
        );
    },
);

test(
    "limpar assinatura nao altera estado anterior",
    () => {
        const before = signed();

        const result =
            invalidateRgpdCapturedSignature(before);

        assert.equal(
            result.ASSINATURA_TITULAR.assinatura_url,
            "",
        );

        assert.equal(
            before.ASSINATURA_TITULAR.assinatura_url,
            "data:image/png;base64,YWJj",
        );

        assert.equal(
            result.ASSINATURA_TITULAR.signatario_nome,
            "Pessoa Teste",
        );

        assert.equal(
            result.ASSINATURA_EMPRESA,
            before.ASSINATURA_EMPRESA,
        );

        const repeated =
            invalidateRgpdCapturedSignature(result);

        assert.equal(repeated, result);
    },
);