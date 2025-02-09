const express = require('express');
const app = express();

app.use(express.json()); // Para processar JSON

// Rota do webhook para verificação
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === "jotinha2025") { 
        console.log("WEBHOOK VERIFICADO!");
        res.status(200).send(challenge); // Retorna o desafio corretamente
    } else {
        console.log("FALHA NA VERIFICAÇÃO DO WEBHOOK");
        res.status(403).send('Falha na verificação');
    }
});

// Iniciar o servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
