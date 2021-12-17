const https = require('https');

var apiBaseUrl = '';
var apiAdapter;

function start(baseUrl, adapter) {
    apiBaseUrl = baseUrl;
    apiAdapter = adapter;
    authorise('hideMePlease', 'hideMePlease');
}

async function authorise(email, password) {

    const data = new TextEncoder().encode(
        JSON.stringify({
            email: email,
            password: password,
        })
    )

    const options = {
        hostname: apiBaseUrl,
        port: 443,
        path: '/v1/signin',
        method: 'POST',
        headers: {
            'Host': apiBaseUrl,
            'Content-Length': data.length,
            'Content-Type': 'application/json',
            'User-Agent': 'ioBroker.komoot',
        }
    }

    apiAdapter.log.debug(JSON.stringify(options));

    const req = https.request(options, res => {

        res.on('data', d => {
            if (res.statusCode === 200) {
                apiAdapter.log.info('Login successfull');
            } else if (res.statusCode === 400) {
                let response = JSON.parse(d);
                apiAdapter.log.info('Login failed. (' + response.error + ').');
            } else {
                apiAdapter.log.error('Error ' + res.statusCode + ' in Authorisation proccess');
            }
            apiAdapter.log.debug(d);
        })
    })

    req.on('error', error => {
        apiAdapter.log.warn(error)
    })

    req.write(data)
    req.end()
}

exports.start = start;