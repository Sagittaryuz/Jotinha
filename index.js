const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔹 Configuração da API da Meta
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// 🔹 Rota para verificação do Webhook da Meta
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verificado com sucesso!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 🔹 Rota para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const body = req.body;
        console.log("📩 Mensagem recebida:", JSON.stringify(body, null, 2));

        if (body.object === "whatsapp_business_account") {
            const messages = body.entry[0].changes[0].value.messages;
            if (messages) {
                const message = messages[0];
                const sender = message.from;
                const text = message.text.body;

                console.log(`📩 Mensagem de ${sender}: ${text}`);

                // 🔹 Lógica para criar lembretes no Google Agenda
                if (text.toLowerCase().includes("lembre")) {
                    await sendWhatsAppMessage(sender, "✅ Entendido! Criando lembrete...");
                    // Aqui você pode chamar a função que cria eventos no Google Agenda
                } else {
                    await sendWhatsAppMessage(sender, "🤖 Olá! Como posso te ajudar?");
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro no webhook:", error);
        res.sendStatus(500);
    }
});

// 🔹 Função para enviar mensagens pelo WhatsApp via API da Meta
async function sendWhatsAppMessage(to, message) {
    try {
        const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
        const response = await axios.post(
            url,
            {
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: { body: message },
            },
            {
                headers: {
                    Authorization: `Bearer ${META_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`📤 Mensagem enviada para ${to}:`, response.data);
    } catch (error) {
        console.error("❌ Erro ao enviar mensagem:", error.response ? error.response.data : error.message);
    }
}

// 🔹 Servidor rodando
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));