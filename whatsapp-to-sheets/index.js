// index.js

require('dotenv').config(); // Load .env locally (safe in development)

const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const express = require('express');
const fs = require('fs');

// 🌐 Keep Render instance alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 WhatsApp bot is running and ready!');
});

app.listen(PORT, () => {
  console.log(`🌐 Server is listening on port ${PORT}`);
});

// 📦 Google Service Account Credentials from ENV
const credsBase64 = process.env.CREDS_BASE64;

if (!credsBase64) {
  console.error("❌ CREDS_BASE64 not found in environment variables.");
  process.exit(1);
}

let credentials;

try {
  const credsJson = Buffer.from(credsBase64, 'base64').toString('utf8');
  credentials = JSON.parse(credsJson);
} catch (error) {
  console.error("❌ Failed to parse credentials JSON:", error.message);
  process.exit(1);
}

// 📊 Google Sheets API Setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });

// 📄 Google Sheet ID (Make sure it's shared with the service account!)
const SPREADSHEET_ID = '1kzRUlafAHKovzyReVAUkk5lmbik36VYP1Ao_pQiezMQ'; // <- Replace if needed

// 📱 WhatsApp Client Setup
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('📱 Scan this QR code with your WhatsApp:');
  console.log(qr);
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
        values: [[timestamp, phoneNumber, message]],
      },
    });

    console.log('✅ Saved to Google Sheets!');
  } catch (error) {
    console.error('❌ Failed to save to Google Sheets:', error);
  }
});

client.initialize();