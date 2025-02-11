const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 📌 Configurações da API Oficial do WhatsApp (Meta)
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

// 📌 Endpoint para Webhook do WhatsApp
app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        if (message && message.entry) {
            const entry = message.entry[0];
            const changes = entry.changes[0];
            const value = changes.value;
            const contact = value.contacts ? value.contacts[0] : null;
            const sender = contact ? contact.wa_id : null;
            const text = value.messages ? value.messages[0].text.body : null;

            if (sender && text) {
                console.log(`📞 Mensagem de ${sender}: ${text}`);

                // Resposta automática 🚀
                await axios.post(WHATSAPP_API_URL, {
                    messaging_product: "whatsapp",
                    to: sender,
                    text: { body: "Olá! Sou o Jotinha. Como posso te ajudar?" }
                }, {
                    headers: {
                        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
                        "Content-Type": "application/json"
                    }
                });

                console.log(`✅ Resposta enviada para ${sender}`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar webhook:", error.response ? error.response.data : error.message);
        res.sendStatus(500);
    }
});

// 🚀 Inicializa o servidor
app.listen(PORT, () => console.log(`🔥 Servidor rodando na porta ${PORT}`));