app.post('/webhook', async (req, res) => {
    try {
        const message = req.body;
        const sender = message.sender || message.phone;
        let processedText = message.text;

        console.log(`Texto processado de ${sender}: ${processedText}`);

        const agentResponse = await queryChatvoltAgent(processedText, sender);
        console.log("Resposta do agente Chatvolt:", agentResponse);

        if (agentResponse.isReminder) {
            if (!userTokens[sender]) {
                const authLink = `https://jotinha-production.up.railway.app/auth/google?phone=${encodeURIComponent(sender)}`;
                const response = `Parece que você quer agendar algo, mas primeiro preciso me conectar ao seu Google Agenda. Por favor, clique neste link para se conectar: ${authLink}`;
                await sendMessage(sender, response);
            } else {
                const friendlyResponse = `Claro! Vou te lembrar de ${agentResponse.title} no dia ${agentResponse.date} às ${agentResponse.time}. Posso adicionar isso à sua agenda? Responda com um "sim" se estiver tudo certo! 😊`;
                await sendMessage(sender, friendlyResponse);
                pendingScheduling[sender] = agentResponse;
            }
        } else {
            await sendMessage(sender, agentResponse.answer);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
        res.status(500).send('Erro interno do servidor.');
    }
});
