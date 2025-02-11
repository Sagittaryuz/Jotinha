const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔹 Suas credenciais
const ZAPI_INSTANCE = "3DC8C8CA9421B05CB51296155CBF9532"; // 🔹 ID da instância da Z-API
const ZAPI_TOKEN = "1D8DE54DAF4B72BC51CA8548"; // 🔹 Token da Z-API
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// ✅ Webhook para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        // 🔹 Validar mensagem recebida
        const sender = message?.phone?.trim();
        const text = message?.text?.message?.trim();

        if (!sender || !text) {
            console.warn("⚠️ Mensagem inválida recebida.");
            return res.status(400).send({ error: "Mensagem inválida." });
        }

        let reply = "Olá! Sou o Jotinha. Como posso te ajudar?";

        // 🔹 Responder sobre lembretes
        if (text.toLowerCase().includes("lembrete") || text.toLowerCase().includes("agendar")) {
            reply = "📅 Você deseja criar um lembrete? Por favor, informe a data e hora!";
        }

        // 🔹 Enviar resposta pelo Z-API
        await axios.post(ZAPI_URL, {
            phone: sender,
            message: reply
        });

        console.log(`✅ Resposta enviada para ${sender}: "${reply}"`);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar webhook:", error.response?.data || error.message);
        res.sendStatus(500);
    }
});

// 🔹 Servidor rodando
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
