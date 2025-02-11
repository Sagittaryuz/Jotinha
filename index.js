app.post("/webhook", async (req, res) => {
    try {
        const message = req.body;
        console.log("📩 Mensagem recebida:", message);

        let text = "";

        // Verificando onde o texto está dentro do JSON
        if (message.text?.message) {
            text = message.text.message.toLowerCase();
        } else if (message.body) {
            text = message.body.toLowerCase();
        } else if (message.content) {
            text = message.content.toLowerCase();
        }

        if (!text) {
            console.log("❌ Nenhum texto identificado na mensagem.");
            return res.sendStatus(200);
        }

        let reply = "Não entendi. Você quer criar um lembrete?";

        if (text.includes("lembrete") || text.includes("agendar")) {
            reply = "📅 Criando um lembrete para você...";
        }

        await axios.post(ZAPI_URL, {
            phone: message.phone,
            message: reply
        });

        console.log(`✅ Resposta enviada para ${message.phone}: ${reply}`);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error.response?.data || error.message);
        res.sendStatus(500);
    }
});
