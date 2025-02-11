const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000; // Define a porta fixa

app.use(express.json());

// 🔹 Configuração da Z-API
const ZAPI_INSTANCE = "3DC8C8CA9421B05CB51296155CBF9532";
const ZAPI_TOKEN = "1D8DE54DAF4B72BC51CA8548"; // Seu token correto
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// ✅ Webhook para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        if (message && message.phone && message.text) {
            const sender = message.phone;
            const text = message.text.message;

            console.log(`📨 Mensagem de ${sender}: ${text}`);

            const reply = "Oi! Sou o Jotinha. Como posso te ajudar?";

            await axios.post(ZAPI_URL, {
                phone: sender,
                message: reply
            });

            console.log(`✅ Resposta enviada para ${sender}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar webhook:", error.response ? error.response.data : error.message);
        res.sendStatus(500);
    }
});

// 🔹 Inicia o servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
