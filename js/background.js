/**
 * Created by carlos on 3/8/15.
 */

var seconds = 5000;
var interval_id;
var notiArr = [];

(function check() {
    //console.log('Checking for Dribbble activity...');

    clearInterval(interval_id);
    interval_id = setInterval(check, seconds);

    req = new XMLHttpRequest();
    req.open('GET', 'http://dribbble.com');
    req.onload = init;
    req.send();
})();

function checkActivity() {
    //https://dribbble.com/activity
    var reqCheck = new XMLHttpRequest();
    reqCheck.open('GET', 'https://dribbble.com/activity');
    reqCheck.onload = function () {
        console.log('Clear Dribbble activity.')
    };
    reqCheck.send();
}


function init() {
    var data = req.responseText;
    var itemslist = $(data).find('.activity-mini');

    if (!itemslist.length) {
        //can't retrieve activity list
        //loginFirst();
    } else {
        checkNews(data);
        sendData(data);
    }
};

function sendData(data) {
    //send full web to popup.js
    chrome.runtime.sendMessage({
            activity_items: data
        },
        function (response) {
            //get response from popup.js
            if (response == 'opened') {
                console.log(response, 'go and check if clear badge & activity');
                manageClearActivity();
                //TODO check when open
            }

        }
    );
}


function checkNews(data) {
    //reading the html
    var $data = $(data);
    var newerActivity = $data.find('.activity-mini li:first');
    var newerActivityText = newerActivity.text().replace(/(\r\n|\n|\r)/gm, "");
    var newerActivityplayerId = $(newerActivity).find('a[href]')[0].pathname.replace('/', '');

    var news = $data.find('.new-activity');

    if (news.length) {
        console.log('there are news!');
        fillNotification(newerActivityplayerId, newerActivityText);

    } else {
        //clearBadge();
    }
}

/**
 *
 * JRIBBBLE API CALL
 *
 *
 */

$.jribbble.setToken('a856179b187e185d438d1fd24d3d5408b57e52bb3d8607b8fdeeda9239c14278');

function fillNotification(newerActivityplayerId, newerActivityText) {
    $.jribbble.users(newerActivityplayerId).then(success, error);

    function success(player) {
        manageNews(player, newerActivityText);

    };

    function error(jqxhr) {
        //err
        console.log('error', jqxhr)
    };

}


/**
 *
 * STORAGE
 *
 *
 */

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
        //val from storage
        if (val) {
            //check activity page & clear badge
            console.log('userWantsClearActivity', val)
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
        //TODO make seconds global
        var seconds = val;
        console.log(seconds, val)
    }
};
/**
 *
 * NOTIFICATIONS
 *
 *
 */

function showBadge() {
    chrome.browserAction.setBadgeText({text: 'NEW'});
    chrome.browserAction.setBadgeBackgroundColor({color: '#ea4c89'});
    $(".see-all").text('Check & Clear the badge!');
}

function clearBadge() {
    chrome.browserAction.setBadgeText({text: ''});
    $(".see-all").text('See all incoming activity');
}

var showNotification = function (player, newerActivityText) {

    var notiExists = notiArr.indexOf(newerActivityText);
    console.log(notiArr)
    if (notiExists == -1) {
        var notifId = newerActivityText;
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





