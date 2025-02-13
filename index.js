app.post('/webhook', async (req, res) => {
  try {
    const message = req.body;
    const sender = message.sender || message.phone;
    let processedText = message.text;

    console.log(`Texto processado de ${sender}: ${processedText}`);

    // Consulta o ChatVolt para interpretar a mensagem
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

    // Verifica se é um lembrete
    if (parsedAnswer && parsedAnswer.isReminder) {
      if (!userTokens[sender]) {
        // Solicita vinculação ao Google Agenda
        const authLink = `https://jotinha-production.up.railway.app/auth/google?phone=${encodeURIComponent(sender)}`;
        await sendMessage(sender, `Para agendar este lembrete no Google Agenda, preciso que você conecte sua conta. Clique neste link para conectar: ${authLink}`);
      } else {
        // Solicita confirmação do usuário
        const friendlyResponse = `Entendido! Vou agendar "${parsedAnswer.title}" para ${parsedAnswer.date} às ${parsedAnswer.time}. Confirma?`;
        await sendMessage(sender, friendlyResponse);
        pendingScheduling[sender] = parsedAnswer;
      }
    } else if (processedText.toLowerCase() === 'sim' && pendingScheduling[sender]) {
      // Confirmação do lembrete e adição ao Google Agenda
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(userTokens[sender]);
      try {
        await addEventToGoogleCalendar(oauth2Client, pendingScheduling[sender]);
        await addEventToSheet(oauth2Client, sender, pendingScheduling[sender]);
        await sendMessage(sender, 'Evento agendado com sucesso no Google Agenda!');
      } catch (error) {
        console.error('Erro ao agendar:', error);
        await sendMessage(sender, 'Desculpe, ocorreu um erro ao agendar no Google Agenda. Tente novamente mais tarde.');
      }
      delete pendingScheduling[sender];
    } else {
      // Resposta padrão para outras mensagens
      await sendMessage(sender, parsedAnswer);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro ao processar a mensagem:', error);
    res.status(500).send('Erro interno do servidor.');
  }
});
