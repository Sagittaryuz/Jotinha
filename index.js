const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔹 Suas credenciais fixas (sem ENV)
const ZAPI_INSTANCE = "3DC8C8CA9421B05CB51296155CBF9532";
const ZAPI_TOKEN = "1D8DE54DAF4B72BC51CA8548";
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// ✅ Webhook para receber mensagens
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("🔹 Mensagem recebida:", message);

        if (message && message.sender && message.text && message.text.message) {
            const sender = message.sender;
            const text = message.text.message;
            console.log(`📩 Mensagem de ${sender}: ${text}`);

            // 🔹 Resposta automática
            const reply = "Olá! Sou o Jotinha. Como posso te ajudar?";

            // 🔹 Enviar resposta pela Z-API
            await axios.post(ZAPI_URL, {
                phone: sender,
                message: reply
            });

            console.log(`✅ Resposta enviada para ${sender}`);
        } else {
            console.log("❌ Nenhum texto identificado na mensagem.");
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar webhook:", error.response?.data || error.message);
        res.sendStatus(500);
    }
});

// 🔹 Mantém o Railway ativo
setInterval(() => {
    console.log("✅ Keep-alive ping");
}, 5 * 60 * 1000); // A cada 5 minutos

// 🔹 Previne SIGTERM do Railway
process.on("SIGTERM", () => {
    console.log("❌ Recebi SIGTERM, mas mantendo o servidor ativo.");
});

// 🔹 Inicia o servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
