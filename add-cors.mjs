import https from 'https';

const token = 'skvk25clYoDCrYywzKSjWNNBAw7ks7sxXFONkqmn3lYu0wtqxqLWlsdZVv18DQj4GvdBvfpZk0aYivm4DGKMVEDNgQJiPmsxkWFIVInSPZs6vSEsf7MwK9LHrNjsL14YOGsVCRThvyqtATAViDPEbH8F4Mu525eqU3z2jpgMhizA5zHM11n0';
const projectId = 'wpbatz1m';

function addCors(origin) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ origin, allowCredentials: true });
    const req = https.request({
      hostname: 'api.sanity.io',
      path: `/v2021-06-07/projects/${projectId}/cors`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`${origin}: ${res.statusCode} - ${body}`);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

await addCors('https://thermowerk.ch');
await addCors('https://www.thermowerk.ch');
console.log('Done!');
