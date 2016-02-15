/*
 * Copyright (c) 2015. Carlos March
 * This scripts init the APP
 * We first set default values on storage
 * Then we call dribbble to manage user notifications
 */

//*****************************
// RUNTIME MESSAGES
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
        //console.log(data);
        changeTime(data.intervalTimeout);
        options.clearActivity = data.clearActivity;
        options.showNotifications = data.showNotifications;
    }
});

//*****************************
// DEFAULT
//*****************************
var options = {
    clearActivity: true,
    intervalTimeout: 1800000,
    showNotifications: true
};

var timer = null;
var lastHandler = null;

var lastAJAX = Date.now();
var limitAjaxCall = 10000;
/* 10 seconds*/
var firstTime;

var scrapStorage;

//*****************************
// INIT
//*****************************
setStorageDefaultValues();
start(check);


//*****************************
// TIMER FUNCTIONS
// thanks to @neoroger
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
    //console.log('changeTime to', options.intervalTimeout)
}


//Function to stablish rate limit
function limitAJAXCalls() {
    if (!firstTime) {
        // Let pass if is the first time
        // For a better user experience
        firstTime = true;
        return true;
    }
    var now = Date.now(), diff = now - lastAJAX;

    if (diff >= limitAjaxCall) {
        lastAJAX = now;
        return true;
    } else {
        return false;
    }

}

//*****************************
// INIT APP FUNCTIONS
//*****************************


// Check Storage Values for: showNotifications, clearActivity & intervalTimeout
// If values are EMPTY set DEFAULT options
// @showNotifications : options.showNotifications
// @clearActivity : options.clearActivity
// @intervalTimeout : options.intervalTimeout
function setStorageDefaultValues() {
    chrome.storage.sync.get(null, function (items) {
        try {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError.message);
            } else {

                //console.log(items);
                if (isEmpty(items)) {
                    //console.log('storage empty');
                    //Set Default showNotifications value to options
                    chrome.storage.sync.set({
                        showNotifications: options.showNotifications,
                        clearActivity: options.clearActivity,
                        intervalTimeout: options.intervalTimeout
                    });
                } else {
                    //console.log('storage has data');
                    // Equal options default value to storage
                    options.showNotifications = items.showNotifications;
                    options.clearActivity = items.clearActivity;
                    changeTime(items.intervalTimeout);
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

    // API RATE LIMITING
    // one each 10 seconds max

    if (limitAJAXCalls()) {
        console.log('Checking Dribbble Activity...');

        req = new XMLHttpRequest();
        req.open('GET', 'http://dribbble.com');
        req.onload = initApiCall;
        req.send();
    } else {
        // API RATE LIMITED
        if (scrapStorage) {
            //print stored data
            scrapStoragePrint(scrapStorage);
        } else {
            // We don't have data
            // Send message to popup.js
            chrome.runtime.sendMessage({
                api_limit: true
            });
        }

    }

}


// Scrap data
// Init rendering functions
function initApiCall() {
    var data = req.responseText;
    var itemslist = $(data).find('.activity-mini');

    //STORE scrapped data
    scrapStorage = data;

    //Store news first time
    if (storedNewsID.length <= 0) {
        storeItemsID(data)
    }

    //Can't retrieve activity list. User is not logged in
    if (!itemslist.length) {

        //Send message to popup.js
        chrome.runtime.sendMessage({
            not_logged: true
        });

    } else {
        checkNews(data);
        sendData(data);
    }
};


// We have stored data
// Init rendering functions with scrapped data
function scrapStoragePrint(scrapStorage) {
    console.log('Stored Data')
    checkNews(scrapStorage);
    sendData(scrapStorage);
}


// Check if there are news and proceed to check:
// if user wants desktop notifications
// and show the notification badge
function checkNews(data) {
    var $data = $(data);
    var news = $data.find('.new-activity');
    $data.find('.activity-mini li:not(:last-child)').each(function () {
        var itemActivityplayerId = $(this).find('a[href]')[0].pathname.replace('/', '');
        var itemActivityText = $(this).text().replace(/(\r\n|\n|\r)/gm, "").replace(/  +/g, ' ');
        var itemActivityID = itemActivityplayerId + '+' + $(this).attr('class') + '+' + $(this).find('>a').text().split(' ').join('-');
        if (news.length) {
            showBadge();
            if (storedNewsID.indexOf(itemActivityID) == -1) {
                storedNewsID.push(itemActivityID);
                console.log('Hey cowboy. We\'ve got news!')
                fillNotification(itemActivityplayerId, itemActivityText, itemActivityID);
            }
        } else {
            clearBadge();
        }
    });

}


//Store ItemsID then this will help
//to show notifications
storedNewsID = [];
function storeItemsID(data) {
    var $data = $(data);
    $data.find('.activity-mini li:not(:last-child)').each(function () {
        var itemActivityplayerId = $(this).find('a[href]')[0].pathname.replace('/', '');
        var itemActivityID = itemActivityplayerId + '+' + $(this).attr('class') + '+' + $(this).find('>a').text().split(' ').join('-');
        storedNewsID.push(itemActivityID);
    });
}


//send full web to popup.js
//On popup.js the data is rendered
function sendData(data) {
    chrome.runtime.sendMessage({
            activity_items: data
        },
        function (response) {
            //get response from popup.js
            if (response == 'opened') {
                //console.log('Manage Clear Activity');
                manageClearActivity();
            }
        }
    );
}


//Opens new tab with dribbble activity page
//Function to check Activity Notification Icon
function checkActivity() {
    var urlToOpen = 'https://dribbble.com/activity';

    var reqCheck = new XMLHttpRequest();
    reqCheck.open('GET', urlToOpen);
    reqCheck.onload = function () {
        console.log('Clear Dribbble Activity')
        clearBadge();
    };
    reqCheck.send();

}


//******************************
// JRIBBBLE API CALL
//*****************************

$.jribbble.setToken('a856179b187e185d438d1fd24d3d5408b57e52bb3d8607b8fdeeda9239c14278');

function fillNotification(newerActivityplayerId, newerActivityText, notificationActivityID) {
    //We need the player photo so call api with played id
    $.jribbble.users(newerActivityplayerId).then(success, error);

    function success(player) {
        manageNews(player, newerActivityText, notificationActivityID);
    };

    function error(jqxhr) {
        //error
        console.error('error', jqxhr)
    };

}


//*****************************
// STORAGE
//*****************************

function manageNews(player, newerActivityText, notificationActivityID) {

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
        //console.log('showNotifications:', val)
        if (val) {
            //show Notification
            showNotification(player, newerActivityText, notificationActivityID);
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
        //console.log('clearActivity:', val)
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
    //chrome.browserAction.setBadgeText({text: 'NEW'});
    //chrome.browserAction.setBadgeBackgroundColor({color: '#ea4c89'});
    chrome.browserAction.setIcon({
        path: {
            "19": 'images/icon-activity-pink.png',
            "38": 'images/icon-activity-pink.png'
        }
    });
    $(".see-all").text('Check & Clear the badge!');
    animateIcon();
}

function clearBadge() {
    chrome.browserAction.setBadgeText({text: ''});
    //$(".see-all").text('See all incoming activity');
    chrome.browserAction.setIcon({
        path: {
            "19": 'images/icon-activity-grey.png',
            "38": 'images/icon-activity-grey.png'
        }
    });
}


var showNotification = function (player, newerActivityText, notificationActivityID) {

    //create id for this notification
    var notifId = notificationActivityID;

    chrome.notifications.create(notifId, {
        type: "basic",
        title: player.username,
        message: newerActivityText,
        iconUrl: player.avatar_url,
        appIconMaskUrl: 'images/icon-mask.png'
        // buttons: [
        //   { title: 'Go' },
        //   { title: 'Ignore' }
        // ]
    }, function () {
        ///created
    });


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
    //console.log(notifId);
    destroyDesktopNotification(notifId);
    manageClearActivity();
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


//Animate Browser Icon
//@TODO Check animation interruption
//Force to be at end image when finished
var searching_images = [
    'images/icon-anim/icon-anim1.png',
    'images/icon-anim/icon-anim2.png',
    'images/icon-anim/icon-anim3.png',
    'images/icon-anim/icon-anim4.png',
    'images/icon-anim/icon-anim5.png',
    'images/icon-anim/icon-anim6.png'];
var image_index = 0;
var animcount = 0;
function animateIcon() {
    animcount++
    if (animcount <= searching_images.length) {
        chrome.browserAction.setIcon({
            path: {
                "19": searching_images[image_index],
                "38": searching_images[image_index]
            }
        });
        image_index = (image_index + 1) % searching_images.length;
        window.setTimeout(animateIcon, 80);
    }

}


//*****************************
// UTILS
//*****************************
function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}