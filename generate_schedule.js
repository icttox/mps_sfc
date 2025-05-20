/**
 * Script to generate production_schedule.json file
 * 
 * Usage: node generate_schedule.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const host = 'localhost';
const port = process.env.PORT || 5001;
const endpoint = '/api/production/generate-file';

console.log('Generating production schedule file...');

// Make HTTP request to the file generation endpoint
const req = http.request({
  host,
  port,
  path: endpoint,
  method: 'GET'
}, (res) => {
  let data = '';
  
  // A chunk of data has been received.
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // The whole response has been received
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Success:', response.message);
      console.log('File generated at:', response.filePath);
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

// Handle errors
req.on('error', (error) => {
  console.error('Error making request:', error.message);
  console.log('Make sure the server is running at http://' + host + ':' + port);
});

// End the request
req.end();