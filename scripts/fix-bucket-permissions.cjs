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
const bucketId = 'writeups-private';

console.log('Updating private bucket permissions...');
console.log('Endpoint:', endpoint);
console.log('Bucket:', bucketId);

const url = new URL(endpoint + '/storage/buckets/' + bucketId);
const body = JSON.stringify({
  name: 'Writeups Private',
  permissions: ['read("label:approved")', 'read("label:premium")'],
  fileSecurity: false
});

const req = https.request({
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'PUT',
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
    if (res.statusCode === 200) {
      console.log('✅ Bucket permissions updated successfully!');
      console.log('   Users with "approved" or "premium" label can now read private writeups.');
    } else {
      console.log('Response:', data);
    }
  });
});
req.on('error', e => console.error('Error:', e));
req.write(body);
req.end();
