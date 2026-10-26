// getRefreshToken.js
// Run this ONCE to authorize your Google account and get a refresh token.
//
// Setup before running:
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Create OAuth client ID -> Application type: "Desktop app"
// 3. Copy the client_id and client_secret it gives you
// 4. npm install googleapis open
//
// IMPORTANT: In Google Cloud Console, under your OAuth client's
// "Authorized redirect URIs", add exactly:
//   http://localhost:3017/oauth2callback

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
require("dotenv").config();

// Paste your OAuth client credentials here (from Google Cloud Console)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 3017; // must match the redirect URI you registered in Cloud Console
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

console.log(process.env.GOOGLE_CLIENT_ID)
if (!CLIENT_ID || CLIENT_ID.includes('YOUR_CLIENT_ID') || !CLIENT_SECRET || CLIENT_SECRET.includes('YOUR_CLIENT_SECRET')) {
  console.error('\n❌ You forgot to replace CLIENT_ID and/or CLIENT_SECRET at the top of this file with your real values from Google Cloud Console.\n');
  process.exit(1);
}
 
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
 
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent',
});
 
const server = http
  .createServer(async (req, res) => {
    try {
      const qs = url.parse(req.url, true).query;
 
      if (!qs.code) {
        res.end('No code received.');
        return;
      }
 
      res.end('Authorization successful! You can close this tab and go back to your terminal.');
      server.close();
 
      const { tokens } = await oAuth2Client.getToken(qs.code);
 
      console.log('\n✅ Success! Add these to your .env file:\n');
      console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\nKeep these secret — do not commit .env to git.\n');
 
      process.exit(0);
    } catch (err) {
      console.error('Error retrieving token:', err.message);
      process.exit(1);
    }
  })
  .listen(PORT, () => {
    console.log(`\nOpen this URL in your browser and log in:\n\n${authUrl}\n`);
  });