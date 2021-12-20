/**
 * ioBroker KOMOOT Adapter
 *
 * (c) 2021 basti4557 <sebastian@vindicators.de>
 *
 * MIT License
 */

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
//const jsdom = require("jsdom");

const komootApi = require('./lib/komoot-api');
const adapterName = require('./package.json').name.split('.').pop();
let adapter;

let timer = null;
let stopTimer = null;


function startAdapter(options) {
    options = options || {};
    Object.assign(options, {name: adapterName});

    adapter = new utils.Adapter(options);

    adapter.on('message', obj => obj && processMessage(obj));

    adapter.on('ready', () => main(adapter));

    adapter.on('unload', () => {
        isStopping = true;
    });
    return adapter;
}

function processMessage(obj) {
    if (!obj || !obj.command) {
        return;
    }

    switch (obj.command) {
    }
}

function stop() {
    stopTimer && clearTimeout(stopTimer);
    stopTimer = null;

    // Stop only if schedule mode
    if (adapter.common && adapter.common.mode === 'schedule') {
        stopTimer = setTimeout(() => {
            stopTimer = null;
            timer && clearTimeout(timer);
            timer = null;
            isStopping = true;
            adapter.stop();
        }, 30000);
    }
}

async function main(adapter) {
    await startKomootApi();
}

async function startKomootApi() {
    await checkProperties(adapter);

    await komootApi.start('account.komoot.com', adapter);
    await sleep(2000);
    let userId = await komootApi.getUserId();

    if (userId !== false) {
        await synchronizeTours(userId);
    }

    setTimeout(function () {
        startKomootApi()
    }, adapter.config.interval);
}

async function synchronizeTours(userId) {
    let domTours = await komootApi.getPage('www.komoot.de', '/user/' + userId + '/tours?type=recorded');

    if (domTours !== false) {
        let tours = domTours.window.document.querySelectorAll('li');
        let i = 0;
        for (const [counter, tour] of tours.entries()) {
            let tourUrl = tour.querySelector('a[data-test-id="tours_list_item_title"]');
            if (tourUrl !== null) {
                let tourName = tour.querySelector('a[data-test-id="tours_list_item_title"]');
                let tourId = (tourUrl + '').substring(6);
                let tourDate = tour.querySelector('span[class="tw-text-secondary"]');
                // Tour is valid. proccessing tour.
                adapter.log.debug(tourName + ': ' + tourId + '[' + i + ']');

                // Last Tour
                if (i === 0) {
                    let stateLastTourId = await komootApi.getState("info.lastTourId");
                    if (tourId !== stateLastTourId.val) {
                        adapter.log.debug('Updated lastTourId to ' + tourId);
                        adapter.setState('info.lastTourId', tourId, true);
                    }
                }
                i += 1;
            }
        }
    }
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function checkProperties(adapter) {
    return new Promise(async (resolve, reject) => {
        let email = adapter.config.email;
        let password = adapter.config.password;
        let interval = parseInt(adapter.config.interval);

        if (email === '' || password === '') {
            adapter.log.error('E-Mail and password missing. Cant fetch data, stopping.');
            adapter.stop();
            await sleep(5000);
        }

        if (interval < 60000) {
            adapter.log.warn("Interval has been set below 60000ms. Set it to 60000.");
            adapter.config.interval = 60000;
        }

        resolve();
    });
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = start;
} else {
    // or start the instance directly
    startAdapter();
}