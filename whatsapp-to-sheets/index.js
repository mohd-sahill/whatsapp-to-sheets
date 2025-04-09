const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load credentials from ENV (Render compatible)
const credsBase64 = process.env.CREDS_BASE64;
const credsJson = Buffer.from(credsBase64, 'base64').toString('utf8');
const credentials = JSON.parse(credsJson);

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = '1kzRUlafAHKovzyReVAUkk5lmbik36VYP1Ao_pQiezMQ'; // Replace this with your actual Sheet ID

// WhatsApp setup
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

    // Skip status messages or empty messages
    if (!message || phoneNumber.includes('status@')) return;

    console.log(`📩 ${phoneNumber}: ${message}`);

    // Save to Google Sheets
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



