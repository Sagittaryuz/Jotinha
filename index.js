const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// TOKEN DE VERIFICAÇÃO DO WEBHOOK
const VERIFY_TOKEN = "jotinha2025";

// ✅ Endpoint para verificação do webhook no Meta
app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook validado com sucesso!");
        res.status(200).send(challenge);
    } else {
        res.status(403).send("Falha na verificação");
    }
});

// ✅ Endpoint para receber mensagens do WhatsApp
app.post("/webhook", (req, res) => {
    console.log("Mensagem recebida:", JSON.stringify(req.body, null, 2));

    // Responde com status 200 para o Meta saber que recebemos a mensagem
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
