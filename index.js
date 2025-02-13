const express = require('express');
const bodyParser = require('body-parser');
const { queryChatvoltAgent } = require('./chatvolt');
const { addEventToGoogleCalendar, addEventToSheet } = require('./google-calendar');
const { sendMessage } = require('./zapi');

const app = express();
app.use(bodyParser.json());

// Configurações e rotas principais

app.post('/webhook', async (req, res) => {
    // Lógica principal do webhook, utilizando as funções importadas
});

// Outras rotas e configurações

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
