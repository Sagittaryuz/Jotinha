const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ Configuração da API do Google Agenda
const CLIENT_ID = "908522706004-3el3nh027is8butb27lan25anmf3sbat.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground"; 
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// ✅ Inicializa a autenticação com Google OAuth2
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// ✅ Configuração do Z-API (Integração WhatsApp)
const ZAPI_INSTANCE = "3DC8C8CA9421B05CB51296155CBF9532";
const ZAPI_TOKEN = process.env.ZAPI_TOKEN; 
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// ✅ Lista de usuários autorizados para uso do Google Agenda
const USERS_WHITELIST = ["+5564999219172", "+5564999814117", "+5562981877123"];

// ✅ Webhook para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        if (!message || !message.sender || !message.message) {
            return res.sendStatus(400);
        }

        const sender = message.sender;
        const text = message.message;

        // 🔹 Verifica se o usuário está na whitelist
        if (!USERS_WHITELIST.includes(sender)) {
            await sendMessage(sender, "⚠️ Você não tem permissão para acessar essa funcionalidade.");
            return res.sendStatus(403);
        }

        // 🔹 Verifica se a conta Google já está vinculada
        if (!REFRESH_TOKEN) {
            await sendMessage(sender, "🔗 Você precisa vincular sua conta Google antes de criar lembretes. Acesse: https://developers.google.com/oauthplayground");
            return res.sendStatus(200);
        }

        // 🔹 Identifica a intenção do usuário para criar lembretes
        if (text.toLowerCase().includes("lembre")) {
            const lembrete = text.replace(/lembre (de|me) /i, "");
            const event = {
                summary: lembrete,
                start: { dateTime: new Date().toISOString(), timeZone: "America/Sao_Paulo" },
                end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: "America/Sao_Paulo" }
            };

            await calendar.events.insert({
                calendarId: "primary",
                resource: event
            });

            await sendMessage(sender, `✅ Lembrete criado com sucesso: *${lembrete}*`);
        } else {
            await sendMessage(sender, "🤖 Olá! Eu sou o Jotinha. Como posso te ajudar?");
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro no webhook:", error.message);
        res.sendStatus(500);
    }
});

// ✅ Função para enviar mensagens via WhatsApp (Z-API)
async function sendMessage(phone, message) {
    try {
        await axios.post(ZAPI_URL, { phone, message });
        console.log(`📤 Mensagem enviada para ${phone}`);
    } catch (error) {
        console.error("❌ Erro ao enviar mensagem:", error.message);
    }
}

// ✅ Inicia o servidor na porta definida
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
