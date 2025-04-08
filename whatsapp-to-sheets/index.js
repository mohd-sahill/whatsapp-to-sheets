const fs = require('fs');
const { google } = require('googleapis');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Load credentials
const creds = require('./credentials.json');

// WhatsApp client
const client = new Client();

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("📲 Scan this QR code with your WhatsApp");
});

client.on('ready', () => {
    console.log('✅ WhatsApp is ready!');
});

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = '1kzRUlafAHKovzyReVAUkk5lmbik36VYP1Ao_pQiezMQ'; // ← Change this!

client.on('message', async (msg) => {
    const phone = msg.from;
    const message = msg.body;
    const timestamp = new Date().toLocaleString();

    console.log(`📩 ${phone}: ${message}`);

    try {
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:C',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[timestamp, phone, message]],
            },
        });

        console.log("✅ Message saved to Google Sheet");
    } catch (err) {
        console.error("❌ Failed to save to Google Sheets", err);
    }
});

client.initialize();
