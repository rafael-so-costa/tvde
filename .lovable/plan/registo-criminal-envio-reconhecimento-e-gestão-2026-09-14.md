# Registo Criminal — envio, reconhecimento e gestão

## Objetivo
O motorista envia o certificado de registo criminal português (PDF ou foto). O sistema lê automaticamente o código de consulta e a data de validade, guarda o ficheiro, e a empresa faz a gestão com alertas de vencimento.

## Decisões confirmadas
- **Menu**: novo item lateral próprio "Registo Criminal" no login do motorista.
- **Reconhecimento**: processamento local no browser (sem custos de AI).
- **Página /alerts**: fica para tarefa separada (continua com dados de exemplo).

## Contexto atual
- `motoristas` já tem `registo_criminal_valid_until`.
- Existe `documentos_arquivados` como padrão genérico de documentos por entidade.
- Bucket `documents` existe, mas atualmente só admins do tenant conseguem ler/escrever.
- O sistema de alertas ativo usa `alertas_sistema`.

## O que será construído

### 1. Base de dados
Nova tabela `registos_criminais`:
- `motorista_id`, `tenant_id`
- `codigo_consulta`, `data_validade`, `data_emissao`
- `arquivo_url`, `arquivo_nome`, `arquivo_mime`
- `status` (pendente_validacao / validado / rejeitado)
- `dados_extraidos` (JSON com o texto e confiança da leitura)
- `observacoes_empresa`, `validado_por`, `validado_em`

Regras de acesso:
- Motorista vê e cria apenas os seus.
- Gestores/funcionários do tenant vêem e validam todos.
- Perfis externos não podem apagar.

### 2. Armazenamento
- Guardar os ficheiros no bucket `documents`, na pasta `registo-criminal/{user_id}/`.
- Ajustar as permissões para o motorista poder enviar e ver os seus próprios ficheiros.

### 3. Leitura automática no browser
- Usar `pdfjs-dist` para extrair texto de PDFs digitais (caso mais comum das certidões portuguesas).
- Usar `tesseract.js` (português) como alternativa para fotos e PDFs digitalizados.
- Analisador de texto (`criminalRecordParser.ts`) que procura:
  - Código de consulta / código de acesso (padrões alfanuméricos típicos)
  - Data de validade / válido até
  - Data de emissão
  - Nome do titular (para conferência)
- Mostrar os valores encontrados com indicação de confiança; o motorista pode corrigir antes de submeter.

### 4. Página do motorista
- Novo item lateral "Registo Criminal".
- Estado atual do documento: válido / a expirar / vencido / em validação / rejeitado.
- Envio de ficheiro com barra de progresso da leitura.
- Campos lidos automaticamente, editáveis antes de confirmar.
- Botão para ver/descarregar o documento enviado.
- Histórico de envios anteriores.

### 5. Página da empresa
- Novo item lateral "Registos Criminais" (para gestores).
- Tabela com todos os motoristas: nome, código de consulta, validade, estado, dias restantes.
- Filtros: pendentes de validação, válidos, a expirar (30 dias), vencidos, sem documento.
- Ações: ver documento, validar, rejeitar com motivo.
- Ao validar, a data de validade é sincronizada com `motoristas.registo_criminal_valid_until`.

### 6. Alertas de vencimento
- Função no backend que gera alertas em `alertas_sistema` a 30, 15 e 7 dias antes, e no dia do vencimento.
- Alerta separado para documentos vencidos e para motoristas sem documento.
- Tarefa diária agendada, sem criar alertas duplicados.
- Alertas visíveis na campainha de notificações e no painel.

## Notas técnicas
- Dependências novas: `pdfjs-dist`, `tesseract.js`.
- O OCR corre inteiramente no browser; ficheiros grandes podem levar alguns segundos.
- Os padrões de leitura serão ajustados com base nos PDFs reais de teste.

## Precisamos de ti
Envia 2–3 dos PDFs de teste que tens (podes anexá-los na conversa). Assim afino os padrões de leitura ao formato real das certidões e valido a extração do código de consulta e da data de validade.