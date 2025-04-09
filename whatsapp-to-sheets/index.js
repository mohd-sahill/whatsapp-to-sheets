const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const qrcode = require('qrcode-terminal'); // For scannable QR
const express = require('express'); // Keep Render happy (optional web server)

// Load credentials from base64 ENV
const credsBase64 = process.env.CREDS_BASE64;
const credsJson = Buffer.from(credsBase64, 'base64').toString('utf8');
const credentials = JSON.parse(credsJson);

// Google Sheets API setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1kzRUlafAHKovzyReVAUkk5lmbik36VYP1Ao_pQiezMQ'; // Replace with your Sheet ID

// WhatsApp client setup
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// Show scannable QR code in terminal
client.on('qr', (qr) => {
  console.clear();
  console.log('\n📲 Scan this QR code with your phone:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
});

client.on('message', async (msg) => {
  try {
    const phoneNumber = msg.from;
    const message = msg.body;
    const timestamp = new Date().toLocaleString();

    // Skip system/status messages
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

    console.log('✅ Message logged to Google Sheets!');
  } catch (error) {
    console.error('❌ Failed to log message:', error);
  }
});

client.initialize();

// Optional: Keep Render deployment running
const app = express();
app.get('/', (req, res) => res.send('✅ Bot is running!'));
app.listen(10000, () => {
  console.log('🌍 Server is listening on port 10000');
});
