// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

// Configurações (utilize variáveis de ambiente no Railway)
const PORT = process.env.PORT || 3000;
const ZAPI_URL = process.env.ZAPI_URL || 'https://api.z-api.io/instances/3DCABA243C00F0C39C064647D8C73AB0/token/1D8DE54DAF4B72BC51CA8548/send-text';
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || 'F924003aa7532484a9f9dbbd3932b2a03S';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Configure no Railway
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Configure no Railway
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://jotinha-production.up.railway.app/auth/google/callback';

// Números autorizados para agendamento de lembretes
const ALLOWED_NUMBERS = [
  '+55 64 99921-9172',
  '+55 64 9981-411',
  '+55 62 8187-7123'
];

// Armazenamento em memória para tokens do Google dos usuários (idealmente, utilize um BD)
const userTokens = {};

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
 * Endpoint de callback do OAuth2 do Google.
 * Espera receber os parâmetros "code" e "state". Aqui, usamos o parâmetro "state" para
 * identificar o número do usuário (telefone) que iniciou a conexão.
 */
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state; // aqui, state conterá o número do usuário
  if (!code || !state) {
    return res.status(400).send('Código ou estado ausentes.');
  }
  const phone = state;
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    userTokens[phone] = tokens;
    // Envia uma mensagem para o usuário confirmando a conexão
    await sendMessage(phone, 'Sua conta do Google Agenda foi conectada com sucesso!');
    res.send('Conta do Google conectada! Você pode fechar esta janela.');
  } catch (error) {
    console.error('Erro no callback do Google OAuth:', error);
    res.status(500).send('Erro ao conectar sua conta do Google.');
  }
});

/**
 * Endpoint para iniciar o fluxo OAuth2 do Google.
 * O link deve ser acessado com um query param "phone" (ex.: /auth/google?phone=+5511999999999)
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
    state: phone // passamos o número do telefone no state para identificar o usuário no callback
  });
  res.redirect(authUrl);
});

/**
 * Webhook que recebe mensagens do Z-API/Chatvolt.
 * Processa as mensagens (texto ou áudio) e direciona o fluxo:
 *  - Se o remetente estiver na lista de números autorizados, inicia o fluxo de agendamento.
 *  - Caso contrário, processa como uma consulta de suporte utilizando a persona Jotinha.
 */
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body;
    console.log('Mensagem recebida:', message);

    // Ajuste conforme a estrutura real do payload recebido pelo Z-API
    const sender = message.sender;
    let processedText = message.text;
    const isAudio = message.type === 'audio';

    if (isAudio) {
      processedText = await convertAudioToText(message.mediaUrl);
    }

    // Se o remetente estiver na lista de números autorizados para agendamento:
    if (ALLOWED_NUMBERS.includes(sender)) {
      // Verifica se o usuário já está conectado ao Google (tem token armazenado)
      if (!userTokens[sender]) {
        // Envia uma mensagem com o link para conexão com o Google Agenda
        const authLink = `https://jotinha-production.up.railway.app/auth/google?phone=${encodeURIComponent(sender)}`;
        await sendMessage(sender, `Você precisa conectar sua conta do Google Agenda. Por favor, clique neste link para conectar: ${authLink}`);
        return res.status(200).send("Solicitação de conexão enviada.");
      } else {
        // Processa o comando de agendamento utilizando (simulação) o GPT-4 Mini
        const schedulingDetails = await processSchedulingRequest(processedText);
        // Cria o evento no Google Calendar
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials(userTokens[sender]);
        await addEventToGoogleCalendar(oauth2Client, schedulingDetails);
        // Atualiza o Google Sheets com os detalhes do evento
        await addEventToSheet(oauth2Client, sender, schedulingDetails);
        await sendMessage(sender, `Evento "${schedulingDetails.title}" agendado para ${schedulingDetails.date} às ${schedulingDetails.time}.`);
      }
    } else {
      // Fluxo de suporte com a persona Jotinha para demais números
      const responseText = await processSupportQuery(processedText);
      await sendMessage(sender, responseText);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Erro ao processar a mensagem:", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

/**
 * Função _placeholder_ para converter áudio em texto.
 * Integre aqui com uma API de Speech-to-Text (por exemplo, Google Cloud Speech-to-Text).
 */
async function convertAudioToText(mediaUrl) {
  // Implementação de conversão de áudio para texto
  return "Texto convertido do áudio";
}

/**
 * Função _placeholder_ para processar o comando de agendamento.
 * Aqui você pode integrar com o ChatGPT-4 Mini para extrair os detalhes do evento.
 */
async function processSchedulingRequest(text) {
  // Exemplo estático; substitua com a integração real
  return {
    title: "Evento Exemplo",
    date: "2024-05-04",
    time: "13:30",
    notes: "Detalhes do evento"
  };
}

/**
 * Função _placeholder_ para processar consultas de suporte com a persona Jotinha.
 */
async function processSupportQuery(text) {
  // Integre com sua instância do ChatGPT-4 Mini conforme necessário
  return "Esta é uma resposta de suporte utilizando a persona Jotinha.";
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
      // Aqui assume-se uma duração de 1 hora para o evento; ajuste se necessário
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
 * Adiciona os detalhes do evento em uma planilha do Google Sheets.
 */
async function addEventToSheet(oauth2Client, sender, eventDetails) {
  // ID da planilha (extraído da URL compartilhada)
  const spreadsheetId = '1-5hF3hYzEkFVhtdDhKUCY4PPLRHDF6c60yuJKu2k13U';
  // Defina o intervalo onde os dados serão inseridos (ajuste o nome da sheet se necessário)
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
 * Envia uma mensagem para o usuário via Z-API.
 */
async function sendMessage(recipient, text) {
  const payload = {
    phone: recipient,
    message: text
  };
  try {
    await axios.post(ZAPI_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAPI_TOKEN}`
      }
    });
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${recipient}:`, error.response ? error.response.data : error);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
