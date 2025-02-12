// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

// Configurações obtidas via variáveis de ambiente (Railway)
const PORT = process.env.PORT || 3000;
const ZAPI_URL =
  process.env.ZAPI_URL ||
  'https://api.z-api.io/instances/3DCABA243C00F0C39C064647D8C73AB0/token/1D8DE54DAF4B72BC51CA8548/send-text';
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || '1D8DE54DAF4B72BC51CA8548';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Definido no Railway
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Definido no Railway
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'https://jotinha-production.up.railway.app/auth/google/callback';

// Configurações do Chatvolt
const CHATVOLT_AGENT_ID = process.env.CHATVOLT_AGENT_ID; // Ex.: "cm4ig6q8j01tvo0rtuow23axo"
const CHATVOLT_AUTH_TOKEN = process.env.CHATVOLT_AUTH_TOKEN; // Seu token de autenticação

// (Opcional) Lista de números autorizados para agendamento – ajuste ou remova se desejar permitir para todos
const ALLOWED_NUMBERS = [
  '+55 64 99921-9172',
  '+55 64 9981-411',
  '+55 62 8187-7123'
];

// Armazenamento em memória para tokens dos usuários (para produção, use um banco de dados)
const userTokens = {};

// Armazena os agendamentos pendentes (fluxo de confirmação)
const pendingScheduling = {};

/**
 * Remove acentos do texto para facilitar a comparação.
 */
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * (Opcional) Função auxiliar para detectar comandos de lembrete usando palavras-chave.
 * Aqui a lógica não é a principal, pois o objetivo é delegar a interpretação ao Chatvolt.
 */
function isReminderCommandFallback(text) {
  if (!text) return false;
  const normalizedText = removeAccents(text.toLowerCase());
  const keywords = ['lembre', 'lembrete', 'lembrar', 'agendar', 'programar', 'marcar', 'compromisso', 'lembre-me'];
  return keywords.some(keyword => normalizedText.includes(keyword));
}

/**
 * Cria um cliente OAuth2 para acessar os serviços do Google.
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Função para consultar o agente do Chatvolt via endpoint /agents/{id}/query.
 */
async function queryChatvoltAgent(query, sender) {
  if (!CHATVOLT_AGENT_ID || !CHATVOLT_AUTH_TOKEN) {
    console.error("CHATVOLT_AGENT_ID ou CHATVOLT_AUTH_TOKEN não estão definidos.");
    return null;
  }
  const url = `https://api.chatvolt.ai/agents/${CHATVOLT_AGENT_ID}/query`;
  const payload = {
    query: query,
    contact: {
      phoneNumber: sender
    },
    temperature: 0.7,
    modelName: "gpt_4o_mini"
  };
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATVOLT_AUTH_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao consultar o agente Chatvolt:", error.response ? error.response.data : error);
    return null;
  }
}

// Rota raiz para confirmar que o serviço está ativo
app.get('/', (req, res) => {
  res.send('Jotinha Bot is running');
});

// Rota de health check (ping)
app.get('/ping', (req, res) => {
  res.send('pong');
});

/**
 * Endpoint de callback do OAuth2 do Google.
 */
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state; // state contém o número do usuário
  if (!code || !state) {
    return res.status(400).send('Código ou state ausentes.');
  }
  const phone = state;
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    userTokens[phone] = tokens;
    await sendMessage(phone, 'Sua conta do Google Agenda foi conectada com sucesso!');
    res.send('Conta do Google conectada! Você pode fechar esta janela.');
  } catch (error) {
    console.error('Erro no callback do Google OAuth:', error);
    res.status(500).send('Erro ao conectar sua conta do Google.');
  }
});

/**
 * Endpoint para iniciar o fluxo OAuth2 do Google.
 */
app.get('/auth/google', (req, res) => {
  const phone = req.query.phone;
  if (!phone) {
    return res.status(400).send('Número de telefone ausente.');
  }
  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    state: phone
  });
  res.redirect(authUrl);
});

/**
 * Webhook que recebe mensagens do Z-API/Chatvolt.
 */
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body;
    console.log('Mensagem recebida:', message);

    // Processa apenas mensagens do tipo "text" ou "audio"
    const validTypes = ['text', 'audio'];
    if (!validTypes.includes(message.type)) {
      console.log(`Ignorando mensagem do tipo ${message.type}`);
      return res.status(200).send('OK');
    }

    // Usa "sender" ou "phone" para identificar o remetente
    const sender = message.sender || message.phone;
    if (!sender) {
      console.warn("Mensagem sem remetente:", message);
      return res.status(200).send('OK');
    }

    let processedText = message.text;
    if (message.type === 'audio') {
      processedText = await convertAudioToText(message.mediaUrl);
    }
    
    // Log para depuração
    console.log(`Processed text from ${sender}: ${processedText}`);

    // Consulta o Chatvolt para interpretar o comando
    const agentResponse = await queryChatvoltAgent(processedText, sender);
    console.log("Resposta do agente Chatvolt:", agentResponse);

    if (!agentResponse || !agentResponse.answer) {
      // Se não obtiver resposta, caia no fluxo de suporte padrão.
      const responseText = await processSupportQuery(processedText);
      await sendMessage(sender, responseText);
      return res.status(200).send('OK');
    }

    // Tenta interpretar a resposta como JSON estruturado.
    let parsedAnswer = null;
    try {
      parsedAnswer = JSON.parse(agentResponse.answer);
    } catch (e) {
      console.log("Resposta do Chatvolt não está estruturada em JSON, tratando como resposta de suporte.");
    }

    if (parsedAnswer && parsedAnswer.isReminder) {
      // Se o agente identificou o comando como um lembrete.
      if (!userTokens[sender]) {
        const authLink = `https://jotinha-production.up.railway.app/auth/google?phone=${encodeURIComponent(sender)}`;
        await sendMessage(sender, `Você precisa conectar sua conta do Google Agenda para gerenciar lembretes. Por favor, clique neste link: ${authLink}`);
        return res.status(200).send('Solicitação de conexão enviada.');
      }
      // Armazena o lembrete pendente e solicita confirmação.
      pendingScheduling[sender] = parsedAnswer;
      await sendMessage(
        sender,
        `Você deseja agendar o evento "${parsedAnswer.title}" para ${parsedAnswer.date} às ${parsedAnswer.time} no seu Google Agenda? Responda SIM para confirmar ou qualquer outra resposta para cancelar.`
      );
      return res.status(200).send('Confirmação solicitada.');
    } else {
      // Se a resposta do agente não for estruturada como lembrete, assume-se que é suporte.
      await sendMessage(sender, agentResponse.answer);
      return res.status(200).send('OK');
    }
  } catch (error) {
    console.error('Erro ao processar a mensagem:', error);
    res.status(500).send('Erro interno do servidor.');
  }
});

/**
 * Função placeholder para converter áudio em texto.
 */
async function convertAudioToText(mediaUrl) {
  // Aqui você pode integrar com uma API de Speech-to-Text.
  return 'Texto convertido do áudio';
}

/**
 * Função placeholder para processar o comando de agendamento.
 * Idealmente, você pode integrar com o ChatGPT para extrair os dados do lembrete.
 * Exemplo de resposta esperada:
 * {
 *   "isReminder": true,
 *   "title": "Comprar Cimento",
 *   "date": "2025-02-13",
 *   "time": "14:00",
 *   "notes": "Lembrete para comprar cimento"
 * }
 */
async function processSchedulingRequest(text) {
  // Exemplo estático – no fluxo atual, esse método pode não ser chamado se o Chatvolt já retornar a estrutura.
  return {
    isReminder: true,
    title: 'Evento Exemplo',
    date: '2024-05-04',
    time: '13:30',
    notes: 'Detalhes do evento'
  };
}

/**
 * Função placeholder para processar consultas de suporte.
 */
async function processSupportQuery(text) {
  return 'Desculpe, mas não consigo criar lembretes ou agendar compromissos. Posso ajudar com informações sobre produtos ou suporte técnico. Como posso te ajudar hoje?';
}

/**
 * Adiciona um evento no Google Calendar.
 */
async function addEventToGoogleCalendar(oauth2Client, eventDetails) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary: eventDetails.title,
    description: eventDetails.notes,
    start: {
      dateTime: new Date(`${eventDetails.date}T${eventDetails.time}:00`).toISOString(),
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: new Date(new Date(`${eventDetails.date}T${eventDetails.time}:00`).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'America/Sao_Paulo'
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event
  });
  return response.data;
}

/**
 * Adiciona os detalhes do evento a uma planilha do Google Sheets.
 */
async function addEventToSheet(oauth2Client, sender, eventDetails) {
  const spreadsheetId = '1-5hF3hYzEkFVhtdDhKUCY4PPLRHDF6c60yuJKu2k13U';
  const range = 'Sheet1!A:F';
  const values = [
    [
      sender,
      eventDetails.title,
      eventDetails.date,
      eventDetails.time,
      eventDetails.notes,
      new Date().toLocaleString('pt-BR')
    ]
  ];
  const resource = { values };
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource
  });
  return response.data;
}

/**
 * Envia uma mensagem ao usuário via Z-API.
 */
async function sendMessage(recipient, text) {
  if (!text) {
    console.error(`Texto da mensagem é nulo ou vazio para ${recipient}`);
    return;
  }
  const payload = {
    phone: recipient,
    message: text
  };
  try {
    const response = await axios.post(ZAPI_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAPI_TOKEN}`
      }
    });
    console.log(`Mensagem enviada para ${recipient}. Resposta da API:`, response.data);
  } catch (error) {
    console.error(
      `Erro ao enviar mensagem para ${recipient}:`,
      error.response ? error.response.data : error
    );
  }
}

// O servidor escuta em todas as interfaces para compatibilidade com o Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Handlers para sinais de encerramento (SIGTERM e SIGINT)
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando o servidor.');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando o servidor.');
  process.exit(0);
});
