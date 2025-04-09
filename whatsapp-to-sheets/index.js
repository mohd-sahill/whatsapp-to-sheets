const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const express = require('express');

const app = express();
app.get('/', (_, res) => res.send('Bot is live ✅'));
app.listen(10000, () => console.log("🚀 Server is listening on port 10000"));

// 👇 LOCAL: Read from credentials.json
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf-8'));

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual Google Sheet ID

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false, // change to true if you don’t want to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('📱 Scan this QR code with your WhatsApp:');
  require('qrcode-terminal').generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
});

client.on('message', async (msg) => {
  try {
    const phoneNumber = msg.from;
    const message = msg.body;
    const timestamp = new Date().toLocaleString();

    if (!message || phoneNumber.includes('status@')) return;

    console.log(`📩 ${phoneNumber}: ${message}`);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestamp, phoneNumber, message]]
      }
    });

    console.log('✅ Message saved to Google Sheets');
  } catch (err) {
    console.error('❌ Failed to save to Google Sheets:', err);
  }
});

client.initialize();
