# Portal do Motorista: Registo de Expediente + Recibos Verdes

Duas funcionalidades novas, ambas com menu próprio no portal do motorista e painel de gestão para o gestor de frota.

---

# Parte A — Registo de Expediente

## Objetivo
O motorista registra o início e o fim do expediente através do NIF, dentro da app ou numa página pública sem login. Pode corrigir as suas horas; o gestor tem um painel estatístico.

## Decisões confirmadas
- Menu lateral próprio no portal do motorista.
- Painel de gestão para o gestor de frota.
- Sem upload de ficheiros e sem alertas automáticos.
- Identificação pública por NIF; a página pública aceita `?tenant=<id>` como reforço.

## Base de dados
Nova tabela `public.registos_expediente`:
- `id`, `tenant_id`, `motorista_id`
- `data_hora timestamptz not null default now()`
- `tipo text` (`entrada` / `saida`)
- `data_local date` — data em fuso `Europe/Lisbon`
- `origem text` (`app` / `publico`), `ip_address`, `user_agent`
- `corrigido boolean default false`, `corrigido_por`, `corrigido_em`, `observacoes_correcao`
- `created_at`

Índices: `(tenant_id, data_hora)` e `(motorista_id, data_local)`.

Funções SECURITY DEFINER:
- `registar_expediente_por_nif(_nif text, _tenant_id uuid default null)` — resolve o motorista ativo, decide entrada/saída pela contagem ímpar/par do dia, insere e devolve o registo.
- `estatisticas_expediente(_tenant_id, _data_inicio, _data_fim)` — por motorista: segundos trabalhados, dias online, média diária, último registo.
- `motorista_em_servico(_motorista_id)` — último registo e se o turno está aberto.

Acessos: `GRANT SELECT, UPDATE` a `authenticated`, `GRANT ALL` a `service_role`, `EXECUTE` das funções a `anon` e `authenticated`. RLS: motorista vê e corrige apenas os seus (até 30 dias); gestores veem e corrigem todos do tenant; INSERT direto só para gestores — o registo passa pela função.

## Ecrãs
- **Motorista** `/registo-expediente`: estado atual (em serviço desde HH:MM / fora de serviço), botão grande Iniciar/Terminar, histórico e secção de correções por dia.
- **Página pública** `/registo-expediente-publico` (sem login): campo NIF, submissão, confirmação com tipo, hora e total do dia.
- **Gestor** `/gestao-expediente`: filtros por datas, motorista e estado; cards (total de horas, em serviço agora, mais horas, mais dias online); tabela por motorista; gráfico de barras com Recharts.

## Regras
- NIF com 9 dígitos; motorista tem de estar ativo.
- Vários pares entrada/saída por dia; sequência ímpar/par em `Europe/Lisbon`.
- Correções até 30 dias, marcadas com autor e data; registos nunca são apagados.

---

# Parte B — Recibos Verdes

## Objetivo
O motorista envia o PDF do recibo verde (fatura-recibo do Portal das Finanças). O sistema lê os dados do documento, valida-os contra o perfil do motorista e o gestor de frota faz a gestão dos recibos recebidos.

## Base de dados
Nova tabela `public.recibos_verdes`:
- `id`, `tenant_id`, `motorista_id`
- `numero_documento text`, `data_emissao date`, `ano int`, `mes int`
- `nif_emitente text`, `nome_emitente text`
- `nif_adquirente text`, `nome_adquirente text`
- `valor_base numeric`, `valor_iva numeric`, `retencao_irs numeric`, `valor_total numeric`
- `arquivo_url`, `arquivo_path`, `arquivo_nome`, `arquivo_mime`
- `status text` (`pendente_validacao` / `validado` / `rejeitado`)
- `dados_extraidos jsonb`, `avisos_validacao jsonb`
- `observacoes_empresa`, `validado_por`, `validado_em`, `created_by`
- `created_at`, `updated_at`

Índice único por `(tenant_id, motorista_id, numero_documento)` para impedir duplicados. Índice `(tenant_id, ano, mes)`.

Armazenamento: novo bucket privado `recibos-verdes` (20 MB), caminho `{tenant_id}/{motorista_id}/{ficheiro}`, com policies iguais às do bucket de registos criminais (motorista escreve e lê os seus, gestores leem todos do tenant).

Acessos: `GRANT SELECT, INSERT, UPDATE` a `authenticated`, `GRANT ALL` a `service_role`. RLS: motorista vê e cria os seus; gestores veem, validam e rejeitam todos do tenant; ninguém apaga.

## Leitura e validação do PDF
Novo `src/utils/greenReceiptParser.ts`, reutilizando a extração de texto já existente (`documentTextExtraction.ts`, pdfjs com recurso a OCR):
- Número do documento, data de emissão.
- NIF e nome do emitente (o motorista) e do adquirente (a empresa).
- Valores: base, IVA, retenção de IRS, total.

Validações apresentadas antes de confirmar o envio:
- NIF do emitente corresponde ao NIF do motorista no perfil.
- NIF do adquirente corresponde ao NIF da empresa (tenant).
- Data de emissão não é futura.
- Recibo do mesmo número ainda não foi enviado.
- Valor total coerente com base + IVA − retenção.

Cada aviso é mostrado ao motorista; avisos não bloqueiam o envio (exceto duplicado), mas ficam guardados em `avisos_validacao` para o gestor ver.

## Ecrãs
- **Motorista** `/recibos-verdes`: envio do PDF com barra de progresso da leitura, campos lidos e editáveis, lista de avisos de validação, botão de confirmar, e histórico por ano/mês com estado e acesso ao ficheiro.
- **Gestor** `/gestao-recibos-verdes`: tabela de recibos com nome do motorista, número, mês, valores e estado; filtros por motorista, ano/mês e estado (pendentes, validados, rejeitados, motoristas sem recibo do mês); ações ver documento, validar e rejeitar com motivo; totais por período.

---

## Navegação
- `motoristaMenuEntries`: "Registo de Expediente" (ícone `Clock`) e "Recibos Verdes" (ícone `ReceiptText`).
- `adminMenuEntries`: "Expediente" e "Recibos Verdes", com `permissionKey: "motoristas"`.
- `App.tsx`: rotas protegidas `/registo-expediente`, `/recibos-verdes` (motorista), `/gestao-expediente`, `/gestao-recibos-verdes` (super_admin, admin_empresa) e a rota pública `/registo-expediente-publico`.

## Notas técnicas
- Sem dependências novas: `pdfjs-dist`, `tesseract.js` e `recharts` já estão no projeto.
- Agrupamentos de datas em `Europe/Lisbon`.
- Padrões de leitura dos recibos serão afinados com PDFs reais; envia 2–3 recibos verdes teus quando puderes para eu ajustar ao formato exato.
- Typecheck e validação manual dos ecrãs no fim de cada parte.

## Ordem de implementação
1. Migration da Parte A + tipos; ecrãs do motorista, público e gestor.
2. Migration da Parte B + bucket + tipos; parser, ecrã do motorista e ecrã do gestor.
3. Rotas, menus, typecheck e testes.
