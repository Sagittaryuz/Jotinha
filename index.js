const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔹 Configuração da Z-API
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// ✅ Webhook para receber mensagens
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("🔹 Mensagem Recebida:", message);

        if (message && message.sender && message.message) {
            const sender = message.sender;
            const text = message.message;

            console.log(`📩 Mensagem de ${sender}: ${text}`);

            // 🔹 Mensagem de resposta automática
            const reply = "Olá! Sou o Jotinha. Como posso te ajudar?";

            // 🔹 Enviar resposta automática pela Z-API
            await axios.post(ZAPI_URL, {
                phone: sender,
                message: reply
            });

            console.log(`✅ Resposta enviada para ${sender}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro no Webhook:", error.message);
        res.sendStatus(500);
    }
});

// 🔹 Servidor rodando na porta definida
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
