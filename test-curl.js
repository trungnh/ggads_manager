const https = require('https');

https.get('https://localhost/api/test-ga?customerId=5541508335', { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', console.error);
