const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Variáveis de ambiente do Railway
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

// 🔹 Verifica se as variáveis foram configuradas no Railway
if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
    console.error("❌ ERRO: Variáveis de ambiente não configuradas no Railway.");
    process.exit(1);
}

app.use(express.json());

// ✅ Webhook para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        // 🔹 Verifica se a mensagem tem remetente e texto
        const sender = message?.phone?.trim();
        const text = message?.text?.message?.trim();

        if (!sender || !text) {
            console.warn("⚠️ Mensagem inválida recebida.");
            return res.status(400).send({ error: "Mensagem inválida." });
        }

        let reply = "Olá! Sou o Jotinha. Como posso te ajudar?";

        // 🔹 Se a mensagem mencionar "lembrete", responde de forma personalizada
        if (text.toLowerCase().includes("lembrete") || text.toLowerCase().includes("agendar")) {
            reply = "📅 Você deseja criar um lembrete? Informe a data e hora!";
        }

        // 🔹 Enviar resposta automática pela Z-API
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

// 🔹 Inicia o servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
