import test from 'node:test';
import assert from 'node:assert/strict';
import {
    RGPD_COMPANY_POLICY_REQUIREMENTS as fields,
    rgpdCompanyPolicyStatus,
} from '../resources/js/lib/rgpdCompanyPolicy.ts';

test('4r14b5f mapeia exatamente catorze tokens RGPD sem repeticoes', () => {
    assert.equal(fields.length, 14);
    assert.equal(new Set(fields.map((field) => field.token)).size, 14);
});

test('4r14b5f empresa sem politica mostra todos os requisitos em falta', () => {
    const result = rgpdCompanyPolicyStatus({});
    assert.equal(result.complete, 0);
    assert.equal(result.missing.length, 14);
    assert.equal(result.allPresent, false);
});

test('4r14b5f nao contabiliza espacos como valores', () => {
    const result = rgpdCompanyPolicyStatus({ privacidade_contacto_email: '   ' });
    assert.equal(result.complete, 0);
});

test('4r14b5f EPD aceita nome OU email para o mesmo token', () => {
    assert.equal(rgpdCompanyPolicyStatus({ privacidade_epd_nome: 'Responsavel' }).complete, 1);
    assert.equal(rgpdCompanyPolicyStatus({ privacidade_epd_email: 'epd@example.invalid' }).complete, 1);
    assert.equal(rgpdCompanyPolicyStatus({
        privacidade_epd_nome: 'Responsavel', privacidade_epd_email: 'epd@example.invalid'
    }).complete, 1);
});

test('4r14b5f telefone e campos adicionais nao substituem contacto de privacidade', () => {
    const result = rgpdCompanyPolicyStatus({ privacidade_contacto_telefone: '999999999' });
    assert.equal(result.complete, 0);
});

test('4r14b5f identifica todos os requisitos preenchidos sem aprovar juridicamente', () => {
    const values = Object.fromEntries(fields.map((f) => [f.fields[0], 'VALOR DE TESTE']));
    const result = rgpdCompanyPolicyStatus(values);
    assert.equal(result.complete, 14);
    assert.equal(result.missing.length, 0);
    assert.equal(result.allPresent, true);
});