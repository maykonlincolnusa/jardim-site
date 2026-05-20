const DEFAULT_MESSAGE = "Interesse recebido pelo site institucional";
const SAFE_ERROR_MESSAGE = "Não foi possível enviar agora";
const REQUIRED_FIELDS_MESSAGE = "Preencha os campos obrigatórios.";
const WEBHOOK_TIMEOUT_MS = 12000;

module.exports = async function handleSendLead(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, message: "Método não permitido." });
    return;
  }

  try {
    const body = await parseRequestBody(request);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      sendJson(response, 400, { ok: false, message: REQUIRED_FIELDS_MESSAGE });
      return;
    }

    const payload = buildAgentPayload(body);

    if (!isValidLead(payload)) {
      sendJson(response, 400, { ok: false, message: REQUIRED_FIELDS_MESSAGE });
      return;
    }

    if (!process.env.AGENT_WEBHOOK_URL || !process.env.AGENT_WEBHOOK_API_KEY) {
      console.error("AGENT_WEBHOOK_URL ou AGENT_WEBHOOK_API_KEY não configurado.");
      sendJson(response, 500, { ok: false, message: SAFE_ERROR_MESSAGE });
      return;
    }

    const webhookResponse = await postWithTimeout(
      process.env.AGENT_WEBHOOK_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.AGENT_WEBHOOK_API_KEY
        },
        body: JSON.stringify(payload)
      },
      WEBHOOK_TIMEOUT_MS
    );

    if (!webhookResponse.ok) {
      console.error(`Webhook do agente respondeu com status ${webhookResponse.status}.`);
      sendJson(response, 502, { ok: false, message: SAFE_ERROR_MESSAGE });
      return;
    }

    sendJson(response, 200, { ok: true, message: "Lead enviado" });
  } catch (error) {
    console.error("Erro ao enviar lead ao agente:", error && error.message ? error.message : error);
    sendJson(response, 500, { ok: false, message: SAFE_ERROR_MESSAGE });
  }
};

function buildAgentPayload(body) {
  const message = cleanText(pick(body, ["message", "mensagem"])) || DEFAULT_MESSAGE;
  const formType = cleanText(pick(body, ["formType", "form_type"])).toLowerCase();

  return {
    source: "school_website",
    name: cleanText(pick(body, ["name", "nome_responsavel"])),
    phone: cleanText(pick(body, ["phone", "telefone"])),
    email: cleanText(pick(body, ["email"])),
    studentName: cleanText(pick(body, ["studentName", "nome_aluno"])),
    studentAgeOrGrade: cleanText(pick(body, ["studentAgeOrGrade", "idade_crianca"])),
    message,
    wantsVisit: toBoolean(pick(body, ["wantsVisit", "quer_visita"])) || formType === "visit" || formType === "visita",
    preferredVisitDay: cleanText(pick(body, ["preferredVisitDay", "dia_visita"])),
    preferredVisitTime: cleanText(pick(body, ["preferredVisitTime", "periodo_visita"])),
    createdAt: new Date().toISOString()
  };
}

function isValidLead(payload) {
  if (!payload.name || payload.name.length < 3) return false;
  const phoneDigits = digitsOnly(payload.phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 14) return false;
  return true;
}

function parseRequestBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === "string") {
    return Promise.resolve(parseJson(request.body));
  }

  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100_000) {
        reject(new Error("Payload muito grande."));
        request.destroy();
      }
    });

    request.on("end", () => {
      resolve(parseJson(body));
    });

    request.on("error", reject);
  });
}

function parseJson(body) {
  try {
    return JSON.parse(String(body || "{}"));
  } catch {
    return {};
  }
}

function pick(source, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  return ["1", "true", "sim", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function postWithTimeout(url, options, timeoutMs) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: abortController.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
