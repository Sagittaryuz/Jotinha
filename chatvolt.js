// chatvolt.js
const axios = require('axios');

const CHATVOLT_AGENT_ID = process.env.CHATVOLT_AGENT_ID;
const CHATVOLT_AUTH_TOKEN = process.env.CHATVOLT_AUTH_TOKEN;

/**
 * Consulta o agente do Chatvolt para interpretar a query do usuário.
 */
async function queryChatvoltAgent(query, sender) {
    if (!CHATVOLT_AGENT_ID || !CHATVOLT_AUTH_TOKEN) {
        console.error("CHATVOLT_AGENT_ID ou CHATVOLT_AUTH_TOKEN não estão definidos.");
        return null;
    }
    const url = `https://api.chatvolt.ai/agents/${CHATVOLT_AGENT_ID}/query`;
    const payload = {
        query: query,
        contact: {
            phoneNumber: sender
        },
        temperature: 0.7,
        modelName: "gpt_4o_mini"
    };
    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHATVOLT_AUTH_TOKEN}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Erro ao consultar o agente Chatvolt:", error.response ? error.response.data : error);
        return null;
    }
}

module.exports = { queryChatvoltAgent };
