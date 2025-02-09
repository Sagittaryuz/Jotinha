const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ZAPI_INSTANCE = "3DC8C8CA9421B05CB51296155CBF9532";
const ZAPI_TOKEN = process.env.ZAPI_TOKEN; // ✅ CERTO
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// ✅ Endpoint Webhook para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("Mensagem recebida:", message);

        if (message && message.sender && message.message) {
            const sender = message.sender;
            const reply = "Olá! Sou o Jotinha. Como posso te ajudar?";

            // 🔹 Enviar resposta automática pelo Z-API
            await axios.post(ZAPI_URL, {
                phone: sender,
                message: reply
            });

            console.log(`✅ Resposta enviada para ${sender}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar webhook:", error.message);
        res.sendStatus(500);
    }
});

// 🔹 Servidor rodando na porta definida
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));