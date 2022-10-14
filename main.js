/**
 * ioBroker KOMOOT Adapter
 *
 * (c) 2021 basti4557 <sebastian@vindicators.de>
 *
 * MIT License
 */

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const jsdom = require("jsdom");
const fs = require('fs');

const komootApi = require('./lib/komoot-api');
const adapterName = require('./package.json').name.split('.').pop();

const htmlSelectors = require('./config/html-selectors.json');

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
    await syncronizeGithubQuerySelectors();
    await startKomootApi();
}

async function startKomootApi() {
    await checkProperties(adapter);

    await komootApi.start('account.komoot.com', adapter);
     await sleep(2000);
     let userId = await komootApi.getUserId();

     if (userId !== false) {
         await synchronizeTours(userId);
         await syncronizeGeneralData(userId);
         await syncronizeFollowersFollowing(userId, 'followers');
         await syncronizeFollowersFollowing(userId, 'following');
     }

     setTimeout(function () {
         startKomootApi()
     }, adapter.config.interval);
}

async function syncronizeGithubQuerySelectors() {
    return new Promise(async (resolve, reject) => {
        // Get actual query selectors because komoot is changing it often, so nobody has to update the whole adapter because of an changed selector.
        let fileName = 'config/html-selectors.json';

        let content = await komootApi.getGithubUpdates();

        if (content !== false) {
            if (fs.existsSync(fileName)) {
                adapter.log.debug("Actual content from github update file(" + fileName + "): " + fs.readFileSync(fileName))
            } else {
                adapter.log.debug("Update file actually dont exists on filesystem (" + fileName + ")");
            }

            adapter.log.debug("NEW content from github update file:" + content);

            fs.writeFile(fileName, content, function writeJSON(err) {
                if (err) return adapter.log.error('There was on problem while updating the' + fileName + " file.");
                adapter.log.info('Writing updated selectors from github to ' + fileName);
                resolve();
            });
        } else {
            adapter.log.warn("Cant reach the github update file. The query selector update has been canceled.");
            resolve();
        }

        // Every day update the file.
        setTimeout(function () {
            syncronizeGithubQuerySelectors()
        }, 86400000);

    });
}

async function synchronizeTours(userId) {
    let domTours = await komootApi.getPage('www.komoot.de', '/user/' + userId + '/tours?type=recorded');

    if (domTours !== false) {
        let tours = domTours.window.document.querySelectorAll(htmlSelectors.tours);
        let i = 0;

        let tourInfos = [];

        for (const [counter, tour] of tours.entries()) {
            let tourUrl = tour.querySelector(htmlSelectors.tourUrl);
            if (tourUrl !== null) {
                const tourInfo = {
                    name: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.name)).innerHTML,
                    id: (tourUrl + '').substring(6),
                    date: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.data)).innerHTML,
                    duration: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.duration)).innerHTML,
                    distance: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.distance)).innerHTML.split('<')[0] + ' km',
                    speed: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.speed)).innerHTML.split('<')[0] + ' km/h',
                    elevationUp: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.elevationUp)).innerHTML.split('<')[0] + 'm',
                    elevationDown: checkQuerySelector(tour.querySelector(htmlSelectors.tourInfo.elevationDown)).innerHTML.split('<')[0] + 'm',
                }


                // Add Map
                let map = tour.querySelector(htmlSelectors.map);
                if (map) {
                    let dataSrc = map.getAttribute('data-src');
                    if (dataSrc) {
                        tourInfo.map = dataSrc.split('?')[0]
                    }
                }

                // remove null
                for (const [key, value] of Object.entries(tourInfo)) {
                    if (value.toString().startsWith('null')) {
                        delete tourInfo[key];
                    }
                }

                // Tour is valid. proccessing tour.
                adapter.log.debug(JSON.stringify(tourInfo));

                insertObjectTree(tourInfo, 'tours.recorded.');

                tourInfos.push(tourInfo);

                // Last Tour
                if (i === 0) {
                    let stateLastTourId = await komootApi.getState("info.lastTourId");
                    if (tourInfo.id !== stateLastTourId.val) {
                        adapter.log.debug('Updated lastTourId to ' + tourInfo.id);
                        adapter.setState('info.lastTourId', tourInfo.id, true);
                    }
                }
                i += 1;
            }
        }

        insertState("tours.recorded.jsonToursRecorded", JSON.stringify(tourInfos), 'json');
    }
}

function insertObjectTree(object, prefix) {
    for (const [key, value] of Object.entries(object)) {
        let objectName = prefix + object.id + '.' + key;

        adapter.setObjectNotExists(objectName, {
            type: 'state',
            common: {
                name: key,
                desc: key,
                type: 'string',
                read: true,
                write: true
            },
            native: {}
        }, function (err, obj) {
            adapter.setState(objectName, value, true);
        });
    }
}

function insertState(path, value = null, type = 'string') {
    let name = path.split('.').slice(-1)[0];

    adapter.setObjectNotExists(path, {
        type: 'state',
        common: {
            name: name,
            desc: name,
            type: type,
            read: true,
            write: true
        },
        native: {}
    }, function (err, obj) {
        if (value !== null) {
            adapter.setState(path, value, true);
        }
    });
}

async function syncronizeGeneralData(userId) {
    let domGeneral = await komootApi.getPage('www.komoot.de', '/user/' + userId);

    if (domGeneral !== false) {
        let distance = checkQuerySelector(domGeneral.window.document.querySelectorAll(htmlSelectors.distance)[0]);
        let movingTime = checkQuerySelector(domGeneral.window.document.querySelectorAll(htmlSelectors.movingTime)[1]);

        if (distance.innerHTML !== null && movingTime.innerHTML !== null) {
            distance = filterString(distance.innerHTML);
            movingTime = filterString(movingTime.innerHTML);

            let stateDistance = await komootApi.getState("info.distance");
            let stateMovingTime = await komootApi.getState("info.movingTime")

            if (distance !== stateDistance) {
                adapter.setState("info.distance", distance, true);
            }

            if (movingTime !== stateMovingTime) {
                adapter.setState("info.movingTime", movingTime, true);
            }
            adapter.log.debug("Fetched distance and moving time. (Distance: " + distance + " Movingtime: " + movingTime + ")");
        } else {
            // There was a error while selecting the css selector. Probably the css classes got changed again.
            adapter.log.warn("Cant fetch general distance or movingtime. (Probably the css selector has been changed on the Komoot website ?)");
        }
    }
}

async function syncronizeFollowersFollowing(userId, urlSuffix) {
    let domFollowerFollowing = await komootApi.getPage('www.komoot.de', '/user/' + userId + '/' + urlSuffix);

    if (domFollowerFollowing !== false) {
        let followersFollowing = domFollowerFollowing.window.document.querySelectorAll(htmlSelectors.followersFollowing);
        let counter = 0;

        let followersFollowingInfo = [];

        for (const [i, followerFollowing] of followersFollowing.entries()) {
            const followerFollowingInfo = {
                name: checkQuerySelector(followerFollowing.querySelector(htmlSelectors.followerFollowingInfo.name)).innerHTML,
                id: (followerFollowing.querySelector(htmlSelectors.followerFollowingInfo.id) + '').substring(6),
            };

            if (followerFollowingInfo.id !== null && followerFollowingInfo.id !== '') {

                // Add Profile Picture
                let profilePic = followerFollowing.querySelector(htmlSelectors.followerFollowingInfo.profilePic);
                if (profilePic) {
                    let dataSrc = profilePic.getAttribute('data-src');
                    if (dataSrc) {
                        followerFollowingInfo.picture = dataSrc.split('?')[0]
                    }
                }

                // remove null
                for (const [key, value] of Object.entries(followerFollowingInfo)) {
                    if (value.toString().startsWith('null')) {
                        delete followerFollowingInfo[key];
                    }
                }

                adapter.log.debug(JSON.stringify(followerFollowingInfo));

                insertObjectTree(followerFollowingInfo, urlSuffix + '.');

                followersFollowingInfo.push(followerFollowingInfo);

                counter = counter + 1;
            }
        }

        insertState(urlSuffix + '.json' + urlSuffix.charAt(0).toUpperCase() + urlSuffix.slice(1), JSON.stringify(followersFollowingInfo), 'json')
        adapter.setState("info." + urlSuffix, counter, true);
    }
}

function checkQuerySelector(querySelector) {
    if (querySelector) {
        if (querySelector.innerHTML) {
            return querySelector;
        }
    }

    return {innerHTML: 'null'};
}

function filterString(string) {
    return string.replace('&nbsp;', '').replace('Std', '').replace(' ', '');
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