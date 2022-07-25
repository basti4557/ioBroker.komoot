const https = require('https');
const jsdom = require("jsdom");

var apiBaseUrl = '';
var apiAdapter;

async function start(baseUrl, adapter) {
    apiBaseUrl = baseUrl;
    apiAdapter = adapter;

    let cookie = await getState('system.cookie');
    let cookieExpire = parseInt(cookie.lc) + 1000 * 60 * 60 * 12;

    if (cookie.val === null || cookie.val === '' || cookieExpire <= Date.now()) {
        apiAdapter.log.info('No valid cookie found or expired. Authorising with login credentials.');
        if (await authorise(adapter.config.email, adapter.config.password) === false) {
            adapter.stop();
        }
    } else {
        apiAdapter.log.debug('Cookie is valid. Skipping authorisation.');
    }
}

async function getState(state) {
    return new Promise((resolve, reject) => {
        apiAdapter.getState(state, (err, state) => {
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
                    resolve(true);
                } else if (res.statusCode === 400) {
                    let response = JSON.parse(d);
                    apiAdapter.log.info('Login failed. (' + response.error + ').');
                    resolve(false);
                } else {
                    let response = JSON.parse(d);
                    apiAdapter.log.error('Error ' + res.statusCode + ' in Authorisation proccess (' + response.error + ')');
                    resolve(false);
                }
                apiAdapter.log.debug(d);
            })
        })

        req.on('error', error => {
            apiAdapter.log.warn(error);
            resolve(false);
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

            const req = https.request(options, res => {
                let data = '';
                res.on('data', d => {
                    data += d;
                })

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(new jsdom.JSDOM(data));
                    } else {
                        apiAdapter.log.warn('Status ' + res.statusCode + ': ' + host + path);
                        resolve(false);
                    }
                });
            })

            req.on('error', error => {
                apiAdapter.log.warn('ERROR while fetching ' + host + path + ': ' + error);
                resolve(false);
            })

            apiAdapter.log.debug(JSON.stringify(parseForDebug(options)));
            req.end()
        } else {
            apiAdapter.log.debug("Cant execute getPage because cookie is null.");
            resolve(false);
        }
    });
}

async function getUserId() {
    let userId = await getState("info.userId");

    if (userId.val === '' || !userId.val) {
        let discover = await getPage('www.komoot.de', '/account/details');

        if (discover !== false) {
            userId = (discover.window.document.querySelector('input[id="additional_username"]').getAttribute('value'));

            apiAdapter.setState('info.userId', userId, true);
            apiAdapter.log.debug("info.userId is empty. Discovered user id: " + userId);
            return userId;
        } else {
            apiAdapter.log.error("Error while discovering the user id.");
            return false;
        }
    } else {
        apiAdapter.log.debug("Returned userId from state info.userId: " + userId.val);
        return userId.val;
    }
}

function parseForDebug(options) {
    let newOptions = options;
    newOptions.headers['Cookie'] = '*** HIDDEN FOR SECURITY REASONS ***';

    return newOptions;
}

exports.start = start;
exports.getPage = getPage;
exports.getUserId = getUserId;
exports.getState = getState;