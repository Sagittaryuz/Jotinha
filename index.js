const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ZAPI_URL = "https://your-zapi-instance.com"; // Substitua pelo endpoint do Z-API
const ZAPI_TOKEN = "your-api-key"; // Substitua pela API Key do Z-API

// Função para enviar mensagem pelo Z-API
async function sendMessage(phone, message) {
    try {
        const response = await axios.post(`${ZAPI_URL}/send-message`, {
            phone: phone,
            message: message
        }, {
            headers: { "Authorization": ZAPI_TOKEN }
        });

        console.log("Mensagem enviada:", response.data);
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error.response ? error.response.data : error.message);
    }
}

// Endpoint para receber mensagens do WhatsApp via Z-API
app.post("/webhook", async (req, res) => {
    const { phone, message } = req.body;

    console.log(`Mensagem recebida de ${phone}: ${message}`);

    // Responder automaticamente
    await sendMessage(phone, "Olá! O Jotinha está online 🚀");

    res.sendStatus(200);
});

// Inicia o servidor na porta definida
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
