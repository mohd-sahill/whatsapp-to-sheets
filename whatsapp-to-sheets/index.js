const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// Google Sheets auth from .env
const credsBase64 = process.env.CREDS_BASE64;
const credsJson = Buffer.from(credsBase64, 'base64').toString('utf8');
const credentials = JSON.parse(credsJson);

// Setup Google Sheets
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your actual Google Sheet ID

// Initialize WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// Global QR for web preview
let qrCode = '';

client.on('qr', (qr) => {
  qrCode = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('📱 Scan this QR code with your WhatsApp:');
});

// Serve QR code as image in browser
app.get('/', async (req, res) => {
  if (!qrCode) return res.send('QR not ready yet. Please wait...');
  const qrImage = await qrcode.toDataURL(qrCode);
  res.send(`<h2>📱 Scan this QR with WhatsApp:</h2><img src="${qrImage}" />`);
});

// Start express server
app.listen(port, () => {
  console.log(`✅ Server is listening on port ${port}`);
  console.log(`🚀 Your service is live: http://localhost:${port}`);
});

// On ready
client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
});

// On new message
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
    console.error('❌ Error saving to Google Sheets:', error);
  }
});

client.initialize();
