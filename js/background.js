/*
 * Copyright (c) 2015. Carlos March
 * This scripts init the APP
 * We first set default values on storage
 * Then we call dribbble to manage user notifications
 */

//*****************************
//RUNTIME MESSAGES
//*****************************

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {

    if (data.is_open) {
        //Got message from popup.js is_open = true
        //on sendData we send response with data to popup.js
        //sendResponse('is open so check');
        start(check);

    }
    if (data.method == 'save') {
        //Got message from options.js data.method = 'save'
        //send response to options.js
        //sendResponse('is saved so redefine interval');
        //check data with new values
        //console.log(data.intervalTimeout)
        changeTime(data.intervalTimeout);
    }
});


var timer = null;
var lastHandler = null;

var options = {
    showNotifications: true,
    clearActivity: true,
    intervalTimeout: 5000
};

//init()
setStorageDefaultValues();
start(check);


//*****************************
// TIMER FUNCTIONS
//*****************************


function start(handle) {
    lastHandler = handle;
    handle();
    timer = setInterval(handle, options.intervalTimeout)
}

function restart() {
    stop();
    start(lastHandler);
}

function stop() {
    clearInterval(timer);
}

function changeTime(time) {
    options.intervalTimeout = time;
    restart();
    console.log('changeTime to', options.intervalTimeout)
}


//*****************************
// INIT APP FUNCTIONS
//*****************************


//Init checking data from storage - function setStorageDefaultValues()
//Then set seconds timeout variable - function manageInterval()
//The call to dribbble site
// @TODO REVIEW BECAUSE IT'S ASYNC
function init() {
    $.when(
        setStorageDefaultValues(),
        manageInterval()
    ).done(function () {
            //Then Check page
            start(check);
        });
}


// Check Storage Values for: showNotifications, clearActivity & intervalTimeout
// If values are EMPTY set DEFAULT options
// @showNotifications : true
// @clearActivity : true
// @intervalTimeout : 5000
function setStorageDefaultValues() {
    chrome.storage.sync.get(null, function (items) {
        try {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError.message);
            } else {

                //console.log(items);

                //Get showNotifications
                if (!items.showNotifications) {
                    //Set Default showNotifications value to true
                    chrome.storage.sync.set({
                        showNotifications: options.showNotifications
                    });
                }

                //Get clearActivity
                if (!items.clearActivity) {
                    //Set Default clearActivity value to true
                    chrome.storage.sync.set({
                        clearActivity: options.clearActivity
                    });
                }

                //Get intervalTimeout
                if (!items.intervalTimeout) {
                    //Set Default intervalTimeout value to 5000
                    chrome.storage.sync.set({
                        intervalTimeout: options.intervalTimeout
                    });
                }

            }
        } catch (exception) {
            //window.alert('exception.stack: ' + exception.stack);
            console.error((new Date()).toJSON(), "exception.stack:", exception.stack);
        }
    });
}


// INIT API CALL
// Call to dribbble site
function check() {
    console.log('Checking for Dribbble activity...');

    req = new XMLHttpRequest();
    req.open('GET', 'http://dribbble.com');
    req.onload = initApiCall;
    req.send();

}


// Scrap data
// Init rendering functions
function initApiCall() {
    var data = req.responseText;
    var itemslist = $(data).find('.activity-mini');

    if (!itemslist.length) {
        //Can't retrieve activity list
        //User is not logged in
        //loginFirst();
    } else {
        checkNews(data);
        sendData(data);
    }
};


// Check if there are news and proceed to check:
// if user wants desktop notifications
// and show the notification badge
function checkNews(data) {
    //reading the html
    var $data = $(data);
    var newerActivity = $data.find('.activity-mini li:first');
    var newerActivityText = newerActivity.text().replace(/(\r\n|\n|\r)/gm, "");
    var newerActivityplayerId = $(newerActivity).find('a[href]')[0].pathname.replace('/', '');

    var news = $data.find('.new-activity');

    if (news.length) {
        //console.log('there are news!');
        fillNotification(newerActivityplayerId, newerActivityText);

    } else {
        clearBadge();
    }
}


function sendData(data) {
    //send full web to popup.js
    //On popup.js the data is rendered
    chrome.runtime.sendMessage({
            activity_items: data
        },
        function (response) {
            //get response from popup.js
            if (response == 'opened') {
                //console.log(response, 'go and check if clear badge & activity');
                manageClearActivity();
            }
        }
    );
}

function checkActivity() {
    //https://dribbble.com/activity
    //Opens new tab with dribbble activity page
    //this check activity notification
    var reqCheck = new XMLHttpRequest();
    reqCheck.open('GET', 'https://dribbble.com/activity');
    reqCheck.onload = function () {
        //console.log('Clear Dribbble activity.')
        clearBadge();
    };
    reqCheck.send();

}


//******************************
// JRIBBBLE API CALL
//*****************************

$.jribbble.setToken('a856179b187e185d438d1fd24d3d5408b57e52bb3d8607b8fdeeda9239c14278');

function fillNotification(newerActivityplayerId, newerActivityText) {
    //We need the player photo so call api with played id
    $.jribbble.users(newerActivityplayerId).then(success, error);

    function success(player) {
        manageNews(player, newerActivityText);
    };

    function error(jqxhr) {
        //error
        console.error('error', jqxhr)
    };

}


//*****************************
// STORAGE
//*****************************

function manageNews(player, newerActivityText) {

    showBadge();

    //async brainfuck for reading storage value
    //get data from storage and show notification if user wants
    getStorageData(userWantsNotifications)
    function getStorageData(callback) {
        var storageValue = "";

        chrome.storage.sync.get('showNotifications', function (obj) {
            storageValue = obj.showNotifications;
            callback(storageValue);
        });
    }

    function userWantsNotifications(val) {
        //val from storage
        //@param boolean default true
        console.log('showNotifications:', val)
        if (val) {
            //show Notification
            showNotification(player, newerActivityText);
        }
    }
};

function manageClearActivity() {

    //async brainfuck for reading storage value
    //get data from storage and show notification if user wants
    getStorageData(userWantsClearActivity)
    function getStorageData(callback) {
        var storageValue = "";

        chrome.storage.sync.get('clearActivity', function (obj) {
            storageValue = obj.clearActivity;
            callback(storageValue);
        });
    }

    function userWantsClearActivity(val) {
        console.log('clearActivity:', val)
        //val from storage
        if (val) {
            //check activity page & clear badge
            //console.log('userWantsClearActivity', val)
            checkActivity();
        }
    }
};


function manageInterval() {

    //async brainfuck for reading storage value
    //get data from storage and show notification if user wants
    getStorageData(userWantsTimeout)
    function getStorageData(callback) {
        var storageValue = "";

        chrome.storage.sync.get('intervalTimeout', function (obj) {
            storageValue = obj.intervalTimeout;
            callback(storageValue);
        });
    }

    function userWantsTimeout(val) {
        //val from storage
        changeTime(val)
    }
};


//*****************************
// NOTIFICATIONS
//*****************************

function showBadge() {
    chrome.browserAction.setBadgeText({text: 'NEW'});
    chrome.browserAction.setBadgeBackgroundColor({color: ' '});
    $(".see-all").text('Check & Clear the badge!');
}

function clearBadge() {
    chrome.browserAction.setBadgeText({text: ''});
    $(".see-all").text('See all incoming activity');
}


var notiArr = [];
var showNotification = function (player, newerActivityText) {

    var notiExists = notiArr.indexOf(player.username);
    //console.log(notiArr)
    if (notiExists == -1) {
        var notifId = player.username;
        notiArr.push(notifId);

        chrome.notifications.create(notifId, {
            type: "basic",
            title: player.username,
            message: newerActivityText,
            iconUrl: player.avatar_url
            // buttons: [
            //   { title: 'Go' },
            //   { title: 'Ignore' }
            // ]
        }, function () {
            ///created
        });
    }

}


//*****************************
// NOTIFICATION INTERACTION
//*****************************

/* Respond to the user's clicking on the notification message-body */
chrome.notifications.onClicked.addListener(function (notifId) {
    chrome.tabs.create({'url': 'http://dribbble.com/activity'}, function () {
        // Tab opened.
        clearBadge();
        destroyDesktopNotification(notifId);
    });

});

chrome.notifications.onClosed.addListener(function (notifId) {
    destroyDesktopNotification(notifId);
});

chrome.notifications.onButtonClicked.addListener(function (notifId, btnIdx) {
    if (btnIdx === 0) {
        chrome.tabs.create({'url': 'http://dribbble.com/activity'}, function () {
            // Tab opened.
            clearBadge();
            destroyDesktopNotification(notifId);
        });
    } else if (btnIdx === 1) {
        destroyDesktopNotification(notifId);
    }
});

function destroyDesktopNotification(notifId) {
    chrome.notifications.clear(notifId);
}





