# Integração segura do formulário com o agente

Este projeto é apenas o site institucional. Ele captura os dados do formulário e repassa o lead para o webhook externo do agente por uma rota backend interna.

O site não processa IA, não salva em banco, não agenda visitas, não chama WhatsApp e não usa Google Calendar.

## Arquitetura

```text
Formulário do site
  -> POST /api/send-lead
  -> backend do site adiciona x-api-key
  -> POST para AGENT_WEBHOOK_URL
  -> agente valida a chave e processa
```

O navegador nunca recebe `AGENT_WEBHOOK_URL` nem `AGENT_WEBHOOK_API_KEY`.

## Gerar a API Key

Rode:

```powershell
npm run generate:webhook-key
```

Ou diretamente:

```powershell
node scripts/generate-webhook-key.js
```

O script usa:

```js
crypto.randomBytes(32).toString("hex")
```

Use a mesma chave nos dois projetos:

- No `.env` do site: `AGENT_WEBHOOK_API_KEY`
- No `.env` do agente: `SITE_WEBHOOK_API_KEY`

## Configurar o site

Crie um `.env` local com:

```env
AGENT_WEBHOOK_URL=https://URL_DO_AGENTE/webhook/site-lead
AGENT_WEBHOOK_API_KEY=COLE_A_CHAVE_GERADA_AQUI
```

`.env` já está no `.gitignore`.

Não use `NEXT_PUBLIC_AGENT_WEBHOOK_API_KEY`, `VITE_AGENT_WEBHOOK_API_KEY`, `PUBLIC_` ou qualquer variável exposta ao navegador.

## Rota interna

```text
POST /api/send-lead
Content-Type: application/json
```

A rota valida `name` e `phone`, monta o payload e envia para `process.env.AGENT_WEBHOOK_URL` com:

```text
x-api-key: process.env.AGENT_WEBHOOK_API_KEY
```

## Payload enviado ao agente

```json
{
  "source": "school_website",
  "productId": "acolher",
  "productName": "Jardim Acolher",
  "name": "",
  "phone": "",
  "email": "",
  "studentName": "",
  "studentAgeOrGrade": "",
  "message": "",
  "wantsVisit": false,
  "preferredVisitDay": "",
  "preferredVisitTime": "",
  "landingPage": "/",
  "createdAt": ""
}
```

## Testar

Rode o site:

```powershell
npm start
```

Abra:

```text
http://127.0.0.1:3000
```

Preencha o formulário. O navegador deve enviar apenas para `/api/send-lead`; a API Key deve aparecer somente no backend, no header enviado ao webhook do agente.
