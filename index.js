app.post('/webhook', async (req, res) => {
    try {
        const message = req.body;
        const sender = message.sender || message.phone;
        let processedText = message.text;

        console.log(`Texto processado de ${sender}: ${processedText}`);

        const agentResponse = await queryChatvoltAgent(processedText, sender);
        console.log("Resposta do agente Chatvolt:", agentResponse);

        let parsedAnswer;
        try {
            parsedAnswer = typeof agentResponse.answer === 'string' 
                ? JSON.parse(agentResponse.answer) 
                : agentResponse.answer;
        } catch (e) {
            parsedAnswer = agentResponse.answer;
        }

        if (parsedAnswer && parsedAnswer.isReminder) {
            const friendlyResponse = `Claro! Vou te lembrar de ${parsedAnswer.title} no dia ${parsedAnswer.date} às ${parsedAnswer.time}. Posso adicionar isso à sua agenda? Responda com um "sim" se estiver tudo certo! 😊`;
            await sendMessage(sender, friendlyResponse);
            // Armazene o parsedAnswer para uso posterior se o usuário confirmar
            pendingScheduling[sender] = parsedAnswer;
        } else {
            // Se não for um lembrete, envie a resposta normal do chatbot
            await sendMessage(sender, agentResponse.answer);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
        res.status(500).send('Erro interno do servidor.');
    }
});
