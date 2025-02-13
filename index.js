const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const { queryChatvoltAgent } = require('./chatvolt');
const { addEventToGoogleCalendar, addEventToSheet } = require('./google-calendar');
const { sendMessage } = require('./zapi');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://jotinha-production.up.railway.app/auth/google/callback';

const userTokens = {};
const pendingScheduling = {};

function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

app.get('/', (req, res) => {
  res.send('Jotinha Bot is running');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

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

app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const phone = state;
  if (!code || !phone) {
    return res.status(400).send('Código ou número de telefone ausente.');
  }
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

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body;
    const sender = message.sender || message.phone;
    let processedText = message.text;

    console.log(`Texto processado de ${sender}: ${processedText}`);

    const agentResponse = await queryChatvoltAgent(processedText, sender);
    console.log("Resposta do agente Chatvolt:", agentResponse);

    let parsedAnswer;
    try {
      parsedAnswer = typeof agentResponse.answer === 'string' 
        ? JSON.parse(agentResponse.answer) 
        : agentResponse.answer;
    } catch (e) {
      parsedAnswer = agentResponse.answer;
    }

    if (parsedAnswer && parsedAnswer.isReminder) {
      if (!userTokens[sender]) {
        const authLink = `https://jotinha-production.up.railway.app/auth/google?phone=${encodeURIComponent(sender)}`;
        await sendMessage(sender, `Para agendar, preciso me conectar ao seu Google Agenda. Por favor, clique neste link: ${authLink}`);
      } else {
        const friendlyResponse = `Claro! Vou agendar "${parsedAnswer.title}" para ${parsedAnswer.date} às ${parsedAnswer.time}. Confirma?`;
        await sendMessage(sender, friendlyResponse);
        pendingScheduling[sender] = parsedAnswer;
      }
    } else if (processedText.toLowerCase() === 'sim' && pendingScheduling[sender]) {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(userTokens[sender]);
      try {
        await addEventToGoogleCalendar(oauth2Client, pendingScheduling[sender]);
        await addEventToSheet(oauth2Client, sender, pendingScheduling[sender]);
        await sendMessage(sender, 'Evento agendado com sucesso!');
      } catch (error) {
        console.error('Erro ao agendar:', error);
        await sendMessage(sender, 'Desculpe, ocorreu um erro ao agendar. Tente novamente mais tarde.');
      }
      delete pendingScheduling[sender];
    } else {
      await sendMessage(sender, parsedAnswer);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro ao processar a mensagem:', error);
    res.status(500).send('Erro interno do servidor.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando o servidor.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando o servidor.');
  process.exit(0);
});
