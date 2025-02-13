if (parsedAnswer && parsedAnswer.isReminder) {
    const friendlyResponse = `Claro! Vou te lembrar de ${parsedAnswer.title} amanhã às ${parsedAnswer.time}. Posso adicionar isso à sua agenda? Responda com um "sim" se estiver tudo certo! 😊`;
    await sendMessage(sender, friendlyResponse);
    // ... resto do código para lidar com a confirmação
}
// Conteúdo completo do index.js (já atualizado e revisado)
