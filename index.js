const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        let text = message.text?.message?.toLowerCase() || "";

        if (!text) {
            console.log("❌ Nenhum texto identificado.");
            return res.sendStatus(200);
        }

        let reply = "Não entendi. Você quer criar um lembrete?";

        if (text.includes("lembrete") || text.includes("agendar")) {
            reply = "📅 Criando um lembrete para você...";
        }

        if (!message.phone || !reply) {
    console.error("❌ Erro: Dados inválidos, não enviando mensagem.", { phone: message.phone, message: reply });
    return res.sendStatus(400);
}

await axios.post(ZAPI_URL, {
    phone: message.phone.trim(),  // Removendo espaços extras
    message: reply
}).catch(error => {
    console.error("❌ Erro ao enviar mensagem para a Z-API:", error.response?.data || error.message);
});


        console.log(`✅ Resposta enviada para ${message.phone}: ${reply}`);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error.response?.data || error.message);
        res.sendStatus(500);
    }
});

// 🔹 Iniciar o servidor corretamente
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
