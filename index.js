const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error.message);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
