// zapi.js
const axios = require('axios');

const ZAPI_URL = process.env.ZAPI_URL;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;

/**
 * Envia uma mensagem ao usuário via Z-API.
 */
async function sendMessage(recipient, text) {
    if (!ZAPI_URL || !ZAPI_TOKEN) {
        console.error("ZAPI_URL ou ZAPI_TOKEN não estão definidos.");
        return;
    }
    if (!text) {
        console.error(`Texto da mensagem é nulo ou vazio para ${recipient}`);
        return;
    }
    const payload = {
        phone: recipient,
        message: text
    };
    try {
        const response = await axios.post(ZAPI_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ZAPI_TOKEN}`
            }
        });
        console.log(`Mensagem enviada para ${recipient}. Resposta da API:`, response.data);
    } catch (error) {
        console.error(
            `Erro ao enviar mensagem para ${recipient}:`,
            error.response ? error.response.data : error
        );
    }
}

module.exports = { sendMessage };
