# Criar motorista de teste

## Objetivo
Criar um novo utilizador motorista de teste, ativo, com palavra-passe definida, para login imediato.

## Passos

1. **Verificar tenant ativo**
   - Consultar o `tenant_id` dos motoristas ativos existentes (João Coutinho / João Motorista) para reutilizar o mesmo tenant.

2. **Garantir autenticação por email/palavra-passe**
   - Ativar `enable_email_auth` se ainda não estiver ativa (os utilizadores atuais indicam que provavelmente já está).

3. **Criar registo de motorista**
   - Inserir uma linha na tabela `motoristas` com:
     - `tenant_id` identificado no passo 1
     - `nome_completo`, `email` e `nif` únicos
     - `ativo = true`
     - `status_cadastro = 'ativo'`
   - Guardar o `id` gerado para ligar ao utilizador.

4. **Criar conta de utilizador e ligar ao motorista**
   - Invocar a edge function `create-user-account` com:
     - `action`: criação de conta (default)
     - `email`, `password`, `nome_completo`
     - `role = "motorista"`
     - `tenant_id` do passo 1
     - `entity_table = "motoristas"`
     - `entity_id` = id do motorista criado no passo 3
   - A função cria o utilizador auth, perfil, role e liga o `user_id` ao registo de motorista.

5. **Validar e entregar credenciais**
   - Confirmar que o motorista aparece ativo e com `user_id` preenchido.
   - Entregar ao utilizador o email e a palavra-passe definida.

## Nota de segurança
A palavra-passe será definida por nós durante a criação e comunicada no chat. Recomenda-se alterar ou eliminar este utilizador de teste após os testes.