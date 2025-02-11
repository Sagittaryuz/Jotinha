app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;

        if (message.type !== 'ReceivedCallback' || !message.text) {
            return res.sendStatus(200); // Ignora mensagens de status e de presença
        }

        const sender = message.phone;
        const text = message.text.message.toLowerCase(); // Captura o texto corretamente

        console.log(`📩 Mensagem recebida de ${sender}: ${text}`);

        let reply = "Desculpe, não entendi. Posso ajudar com produtos ou suporte técnico.";

        if (text.includes("lembrete") || text.includes("agendamento")) {
            reply = "Ok! Criando um lembrete para você. 📅";
            // Aqui você pode adicionar a lógica para salvar o lembrete na planilha
        }

        await axios.post(ZAPI_URL, {
            phone: sender,
            message: reply
        });

        console.log(`✅ Resposta enviada para ${sender}: ${reply}`);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error.message);
        res.sendStatus(500);
    }
});
