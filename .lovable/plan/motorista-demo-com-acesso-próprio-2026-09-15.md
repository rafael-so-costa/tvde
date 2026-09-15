# Motorista demo com acesso próprio

## Objetivo
Criar um motorista de demonstração, com email e senha, para entrar no portal do motorista e testar todas as áreas (registo criminal, registo de expediente, recibos verdes, assinaturas, consultas de veículos/multas/sinistros/contratos).

## O que vai ser criado
- Conta de acesso: email `motorista.demo@tvde.local` com uma senha simples que lhe será entregue no chat.
- Ficha de motorista "Motorista Demo" na empresa já existente, com dados mínimos completos (nome, NIF, contacto, endereço estruturado) para o perfil ficar ativo.
- Ligação entre a conta e a ficha, com o papel de motorista, para o menu lateral do motorista aparecer corretamente.
- Registo de expediente já funcional através do NIF do motorista demo (serve também para testar a página pública).

## Notas
- Todos os dados serão reais e coerentes (sem campos vazios ou fictícios em locais visíveis), apenas identificados como "Demo".
- O motorista demo terá apenas permissões de leitura nos módulos da empresa, conforme a regra já em vigor, podendo apenas enviar os seus próprios documentos e assinar o que lhe for pedido.
- Nenhuma senha de contas existentes é alterada.

## Detalhes técnicos
- Criação da conta via edge function `create-user-account` (email confirmado), atribuição de `app_role = motorista` em `user_roles`.
- Inserção em `motoristas` com `tenant_id` da empresa ativa, `status_cadastro = ativo` e `user_id` ligado à conta criada.
- Verificação final: login por API e leitura das páginas do portal do motorista no navegador.
