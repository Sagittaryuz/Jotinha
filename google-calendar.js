const { google } = require('googleapis');

// Obter o ID da planilha de uma variável de ambiente
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1-5hF3hYzEkFVhtdDhKUCY4PPLRHDF6c60yuJKu2k13U';

/**
 * Adiciona um evento no Google Calendar.
 */
async function addEventToGoogleCalendar(oauth2Client, eventDetails) {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = {
        summary: eventDetails.title,
        description: eventDetails.notes,
        start: {
            dateTime: new Date(`${eventDetails.date}T${eventDetails.time}:00`).toISOString(),
            timeZone: 'America/Sao_Paulo'
        },
        end: {
            dateTime: new Date(new Date(`${eventDetails.date}T${eventDetails.time}:00`).getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: 'America/Sao_Paulo'
        },
        colorId: eventDetails.colorId || '1', // Adiciona opção de cor (1 é azul por padrão)
        visibility: eventDetails.visibility || 'default' // Adiciona opção de visibilidade
    };

    try {
        // Verifica conflitos de agenda
        const conflicts = await checkCalendarConflicts(calendar, event.start.dateTime, event.end.dateTime);
        if (conflicts.length > 0) {
            console.log("Conflitos encontrados:", conflicts);
            return { success: false, message: "Há conflitos na agenda para este horário.", conflicts };
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error("Erro ao adicionar evento no Google Calendar:", error);
        throw error;
    }
}

/**
 * Verifica conflitos na agenda para um determinado período.
 */
async function checkCalendarConflicts(calendar, startTime, endTime) {
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startTime,
            timeMax: endTime,
            singleEvents: true,
            orderBy: 'startTime'
        });

        return response.data.items;
    } catch (error) {
        console.error("Erro ao verificar conflitos na agenda:", error);
        throw error;
    }
}

/**
 * Adiciona os detalhes do evento a uma planilha do Google Sheets.
 */
async function addEventToSheet(oauth2Client, sender, eventDetails) {
    const range = 'Sheet1!A:G'; // Adicionada uma coluna para status
    const values = [
        [
            sender,
            eventDetails.title,
            eventDetails.date,
            eventDetails.time,
            eventDetails.notes,
            new Date().toLocaleString('pt-BR'),
            eventDetails.status || 'Agendado' // Nova coluna para status
        ]
    ];
    const resource = { values };
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            resource
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error("Erro ao adicionar evento na planilha:", error);
        throw error;
    }
}

module.exports = { addEventToGoogleCalendar, addEventToSheet };
