// google-calendar.js
const { google } = require('googleapis');

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
        }
    };

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar evento no Google Calendar:", error);
        throw error; // Rejeita o erro para ser tratado no chamador
    }
}

/**
 * Adiciona os detalhes do evento a uma planilha do Google Sheets.
 */
async function addEventToSheet(oauth2Client, sender, eventDetails) {
    const spreadsheetId = '1-5hF3hYzEkFVhtdDhKUCY4PPLRHDF6c60yuJKu2k13U';
    const range = 'Sheet1!A:F';
    const values = [
        [
            sender,
            eventDetails.title,
            eventDetails.date,
            eventDetails.time,
            eventDetails.notes,
            new Date().toLocaleString('pt-BR')
        ]
    ];
    const resource = { values };
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource
        });
        return response.data;
    } catch (error) {
        console.error("Erro ao adicionar evento na planilha:", error);
        throw error; // Rejeita o erro para ser tratado no chamador
    }
}

module.exports = { addEventToGoogleCalendar, addEventToSheet };
