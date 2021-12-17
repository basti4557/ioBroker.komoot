/**
 * ioBroker KOMOOT Adapter
 *
 * (c) 2021 basti4557 <sebastian@vindicators.de>
 *
 * MIT License
 */

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const komootApi = require('./lib/komoot-api');
const adapterName = require('./package.json').name.split('.').pop();
let adapter;

let timer = null;
let stopTimer = null;

function start(options) {
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

function main(adapter) {
    let baseUrl = 'account.komoot.com';

    setTimeout(() => {komootApi.start(baseUrl, adapter);}, 5000);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = start;
} else {
    // or start the instance directly
    start();
}