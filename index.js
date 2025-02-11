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

        let text = "";

        // 🔹 Extraindo texto corretamente, independente da estrutura da mensagem
        if (message.text && message.text.message) {
            text = message.text.message.toLowerCase();
        } else if (message.body) {
            text = message.body.toLowerCase();
        } else if (message.content) {
            text = message.content.toLowerCase();
        }

        // 🔹 Se ainda assim não encontrar texto, definir um valor padrão
        if (!text || text.trim() === "") {
            console.log("❌ Nenhum texto identificado.");
            text = "Mensagem vazia";
        }

        // 🔹 Garantindo que phone não é nulo
        const phone = message.phone ? message.phone.trim() : null;

        if (!phone) {
            console.error("❌ Erro: O campo 'phone' está ausente ou inválido.");
            return res.sendStatus(400);
        }

        let reply = "Não entendi. Você quer criar um lembrete?";

        if (text.includes("lembrete") || text.includes("agendar")) {
            reply = "📅 Criando um lembrete para você...";
            // Aqui pode entrar a lógica para conectar com o Google Agenda
        }

        // 🔹 Enviando resposta para a Z-API
        await axios.post(ZAPI_URL, {
            phone: phone,
            message: reply
        }).catch(error => {
            console.error("❌ Erro ao enviar mensagem para a Z-API:", error.response?.data || error.message);
        });

        console.log(`✅ Resposta enviada para ${phone}: ${reply}`);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error.response?.data || error.message);
        res.sendStatus(500);
    }
});

// 🔹 Iniciar o servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
