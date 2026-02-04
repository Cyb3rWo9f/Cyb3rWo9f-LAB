#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env
['.env.local', '.env'].forEach(f => {
  const p = path.join(process.cwd(), f);
  if (fs.existsSync(p)) {
    fs.readFileSync(p, 'utf-8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
});

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = 'writeups_meta';

console.log('Adding previewContent attribute to writeups_meta collection...');
console.log('Endpoint:', endpoint);
console.log('Database:', databaseId);

const url = new URL(endpoint + '/databases/' + databaseId + '/collections/' + collectionId + '/attributes/string');
const body = JSON.stringify({ key: 'previewContent', size: 8000, required: false, default: '' });

const req = https.request({
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey
  }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 202) {
      console.log('✅ previewContent attribute created! Wait a few seconds for it to be ready.');
    } else if (res.statusCode === 409) {
      console.log('⚠️ Attribute already exists - good to go!');
    } else {
      console.log('Response:', data);
    }
  });
});
req.on('error', e => console.error('Error:', e));
req.write(body);
req.end();
