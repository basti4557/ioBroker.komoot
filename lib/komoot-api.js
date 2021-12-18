const https = require('https');
const jsdom = require("jsdom");

var apiBaseUrl = '';
var apiAdapter;
var userId = null;

async function start(baseUrl, adapter) {
    apiBaseUrl = baseUrl;
    apiAdapter = adapter;

    let cookie = await getState('system.cookie');
    let cookieExpire =  parseInt(cookie.lc) + 1000 * 60 * 60 * 12;

    if (cookie.val === null || cookie.val === '' || cookieExpire <= Date.now()) {
        apiAdapter.log.info('No Valid cookie found or expired. Authorising with login credentials.');
        await authorise('hideMyAss', 'hideMyAss');
    } else {
        apiAdapter.log.info('Cookie is valid. Skipping authorisation.');
    }
}

async function getState(state) {
    return new Promise((resolve, reject) => {
        apiAdapter.getState('system.cookie', (err, state) => {
            resolve(state);
        });
    });
}

async function authorise(email, password) {
    return new Promise((resolve, reject) => {
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

                    let cookieString = '';
                    for (const cookie of res.headers["set-cookie"]) {
                        for (const single of cookie.split(';')) {
                            if (single.startsWith('koa_re') || single.startsWith('koa_rt')) {
                                cookieString = cookieString + single + '; ';
                            }
                        }
                    }

                    apiAdapter.setState("system.cookie", cookieString, true);
                    apiAdapter.config.cookie = cookieString;
                    apiAdapter.log.info('Login successfull');
                } else if (res.statusCode === 400) {
                    let response = JSON.parse(d);
                    apiAdapter.log.info('Login failed. (' + response.error + ').');
                } else {
                    let response = JSON.parse(d);
                    apiAdapter.log.error('Error ' + res.statusCode + ' in Authorisation proccess (' + response.error + ')');
                }
                apiAdapter.log.debug(d);
                resolve();
            })
        })

        req.on('error', error => {
            apiAdapter.log.warn(error);
            resolve();
        })

        req.write(data)
        req.end()
    });
}

async function getPage(host, path) {
    return new Promise(async (resolve, reject) => {
        let cookie = await getState('system.cookie');

        if (cookie.val != null) {
            const options = {
                hostname: host,
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'Host': host,
                    'Content-Type': 'application/json',
                    'User-Agent': 'ioBroker.komoot',
                    'Cookie': cookie.val,
                }

            }

            apiAdapter.log.debug(JSON.stringify(options));

            const req = https.request(options, res => {
                let data = '';
                res.on('data', d => {
                    data += d;
                })

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(new jsdom.JSDOM(data));
                    } else {
                        apiAdapter.log.debug(res.statusCode);
                        resolve();
                    }
                });
            })

            req.on('error', error => {
                apiAdapter.log.warn(error);
                reject('Error while loading entity.');
            })

            req.end()
        } else {
            apiAdapter.log.debug("Cant execute getPage because cookie is null.");
            reject('Cookie is null');
        }
    });
}

async function getUserId() {
    if (userId == null) {
        let discover = await getPage('www.komoot.de', '/discover');
        userId = (discover.window.document.querySelector('a[data-test-id="user_menu_profile"]').getAttribute('href')).substring(6);
    }

    return userId;
}

exports.start = start;
exports.getPage = getPage;
exports.getUserId = getUserId;