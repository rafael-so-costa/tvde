# FrotaPro — Plano de migração RGPD 1.1

Estado: PREPARADO — NÃO AUTORIZADO PARA EXECUÇÃO

## 1. Objetivo

Adicionar 18 campos de privacidade à tabela `empresas`,
sem alterar contratos, documentos, assinaturas ou
dados já existentes.

Migration:
`2026_11_09_221501_add_rgpd_privacidade_to_empresas_table.php`

Os 18 campos são opcionais e não possuem valores
jurídicos predefinidos.

## 2. Estado anterior confirmado

Auditoria 4R.14B.4V, 11/11/2026:

- Migration não aplicada.
- 0 das 18 colunas presentes.
- 14 valores documentais RGPD por configurar.
- Tipo RGPD com duas assinaturas incorretas.
- Workflow reconhecido, com cinco etapas.
- Checksum e cópia documental íntegros.
- Revisão jurídica pendente.
- Emissão RGPD não autorizada.

Este diagnóstico representa a data da auditoria.
Deve ser confirmado novamente antes da execução.

## 3. Condições obrigatórias

1. Autorização explícita para alterar a base remota.
2. Identificação inequívoca da base de destino.
3. Acesso à infraestrutura de alojamento autorizado.
4. Snapshot ou backup integral anterior à operação.
5. Verificação da possibilidade de restauro.
6. Confirmação do espaço e das permissões disponíveis.
7. Janela de manutenção e plano de comunicação.
8. Inventário das migrations pendentes.
9. Plano de recuperação validado.

Não utilizar o `.env` local para aplicar alterações
à base remota.

Não executar `migrate:fresh`, `db:wipe`,
`migrate:reset` ou `migrate:rollback` indiscriminadamente.

## 4. Consultas prévias — somente leitura

Executar apenas numa sessão de consulta autorizada,
ligada à base de dados confirmada:

```sql
SELECT DATABASE() AS base_atual;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'empresas'
  AND COLUMN_NAME LIKE 'privacidade_%'
ORDER BY COLUMN_NAME;

SELECT migration, batch
FROM migrations
WHERE migration =
  '2026_11_09_221501_add_rgpd_privacidade_to_empresas_table';
```

Critérios para a migração atual:

- A tabela `empresas` existe.
- A migration ainda não consta do histórico.
- Nenhuma das 18 colunas existe.
- O ficheiro de migration coincide com a versão aprovada.

Se houver colunas parcialmente existentes,
interromper e preparar reconciliação específica.
Não executar a migration original sobre esquema parcial.

## 5. Plano obrigatório de backup

Antes da execução real, um operador autorizado deve:

1. Criar snapshot da base de destino no alojamento.
2. Guardar cópia consistente e protegida da base.
3. Verificar conclusão e integridade do backup.
4. Confirmar que a recuperação pode ser realizada.
5. Registar o ponto de recuperação e responsável.
6. Definir procedimento para alterações concorrentes.

O backup deve incluir a tabela `empresas`,
dados relacionados e a tabela `migrations`.

Um backup não é considerado validado
apenas por ter sido criado.

## 6. Execução futura

Executar somente após aprovação específica,
num ambiente operacional controlado que esteja
ligado à base de destino confirmada.

O procedimento aprovado deverá aplicar
exclusivamente a migration RGPD identificada.

Antes de executar:

- Conferir a configuração efetiva da aplicação.
- Conferir as migrations que serão executadas.
- Confirmar o backup e os critérios de interrupção.
- Confirmar que não existem operações concorrentes
  que comprometam a alteração do esquema.

A execução NÃO faz parte deste bloco 4Z.

## 7. Verificação após execução autorizada

Confirmar:

- 18 colunas presentes na tabela `empresas`.
- Tipos SQL e nulabilidade correspondentes.
- Migration registada uma única vez.
- Empresas preexistentes preservadas.
- Cadastro e edição de empresas funcionais.
- Campos RGPD disponíveis na API e no formulário.
- Nenhuma emissão RGPD desbloqueada indevidamente.

Repetir os testes funcionais e verificar logs.

## 8. Recuperação e rollback

O método `down()` elimina as 18 colunas e poderá
destruir valores que tenham sido preenchidos.

Não executar rollback automático.

Se ocorrer uma falha:

1. Suspender novas alterações.
2. Registar o estado real do esquema.
3. Identificar alterações parciais.
4. Avaliar correção progressiva ou restauro.
5. Recuperar a partir do backup apenas com
   autorização, avaliando alterações posteriores.
6. Verificar integridade e regressões.

A recuperação deve ser definida pelo operador
responsável pela infraestrutura.

## 9. Bloqueios independentes

Mesmo após a migration, a emissão RGPD 1.1
continua bloqueada até:

- Configurar corretamente o tipo RGPD.
- Utilizar uma única `ASSINATURA_TITULAR`.
- Preencher os 14 tokens documentais obrigatórios.
- Concluir a revisão jurídica real.
- Validar e aprovar a versão documental.
- Repetir os testes de emissão com autorização.

Não alterar flags de revisão jurídica para contornar
os bloqueios de publicação.

## 10. Aprovação

Estado: POR AUTORIZAR

Responsável técnico: por definir.
Responsável pelo backup: por definir.
Janela de manutenção: por definir.
Evidência de restauro: pendente.
Autorização de execução: pendente.

Nenhuma alteração de base de dados é efetuada
pela preparação deste procedimento.