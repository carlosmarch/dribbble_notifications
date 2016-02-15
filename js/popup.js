/*
 * Copyright (c) 2015. Carlos March
 * When popup is opened we run all functions to print data
 * In this script we manage data for the list and the detail
 * Also manages interaction
 */

(function($) {

    //On open send message to background.js
    chrome.runtime.sendMessage({
            is_open: true
        },
        function (response) {
            //console.log('I\'m in popup,js is_open: true || response:', response);
        }
    );

    // PRINT DATA IN DOM WITH INFO VIA BACKGROUND.JS MESSAGE
    // Got message from background.js with activity list
    chrome.runtime.onMessage.addListener(
        function (data, sender, sendResponse) {

            //console.log('this is webdata',data);

            if (data.activity_items) {
                printList(data.activity_items);
            } else if (data.api_limit) {
                text = 'Api Rate Limited. <br> Please try again in a few seconds.';
                statusMessage(text);
            } else if (data.not_logged) {
                // there is no data
                // we believe that user is not logged in
                text = 'Login first!'
                statusMessage(text);
            }

            //send response to background.js
            //then in background.js will manageClearActivity()
            sendResponse('opened');

        }
    );



    //*****************************
    // PRINT LIST & DOM & EVENTS
    //*****************************

    function statusMessage(text) {
        $('.load').html(text);
    };

    function printList(data) {

        var itemslist = $(data).find('.activity-mini');

        //insert
        $('#container').html(itemslist);

        //add plus icon
        $('#container ul li:not(:last-child)').each(function () {
            $(this).append('<div class="more-info"><span class="plus">+</span></div>');
        });

        //fix url
        $('#container ul.activity-mini li a').each(function () {
            $(this).attr('href', 'http://dribbble.com' + $(this).attr('href')).attr("target", "_blank");
        });

        isRendered();

    };

    function isRendered() {

        //get info & send to details section
        $('.activity-mini li:not(:last-child)').click(function() {
            var playerId = $(this).find('a[rel^=contact]').attr('href').split("/")[3];
            //storePlayerInfoAndShots(playerId)
            getPlayerData(playerId);
            showDetail();
        });


        /* Hide detail on click return */
        $(document).click(function() {
            $(event.target).closest("#return").each(function () {
                hideDetail();
            });
        });

    }


    //*****************************
    // INIT APP
    //*****************************

    storedPlayers = [];

    function getPlayerData(playerId) {

        if (playerNameExists(playerId)) {
            console.log('is stored player')
            printPlayerBioTPL(storedPlayers[returnStoredKeybyName(playerId)].player_info);
            printPlayerShotTPL(storedPlayers[returnStoredKeybyName(playerId)].player_shots)

        } else {
            console.log('is not stored player')

            //getPlayerBio(playerId, printPlayerBioTPL);
            //getPlayerShots(playerId, printPlayerShotTPL);
            callApiAndStorePlayer(playerId)
        }


    };

    //*****************************
    // JRIBBBLE API CALL
    //*****************************

    $.jribbble.setToken('a856179b187e185d438d1fd24d3d5408b57e52bb3d8607b8fdeeda9239c14278');


    function getPlayerBio(playerId, callback) {
        $.jribbble.users(playerId).then(callback);
    }

    function getPlayerShots(playerId, callback) {
        $.jribbble.users(playerId).shots().then(callback);
    }


    function callApiAndStorePlayer(playerId) {
        $.when(
            $.jribbble.users(playerId).then(function (player) {
                //console.log('1')
                if (!playerIDExists(player.id)) {
                    console.log('Player info is not stored. Insert player data')
                    storedPlayers.push({player_id: player.id, player_name: player.username, player_info: player});
                    return player
                }
            }),
            $.jribbble.users(playerId).shots().then(function (playerShots) {
                //console.log('2')
                if (playerNameExists(playerId)) {
                    console.log('Player is stored. Insert shots')
                    storedPlayers[returnStoredKeybyName(playerId)].player_shots = playerShots;
                    return playerShots
                }
            })
        ).done(function (player, playerShots) {
                //console.log('done', player, playerShots)
                getPlayerData(playerId)

            }).fail(function () {
                console.error('Error ocurred');

            });
    }

    //*****************************
    // TEMPLATES & PRINT DATA
    //*****************************
    var printPlayerBioTPL = function (player) {
        //PROFILE INFO
        //console.log(player)

        var location = (player.location) ? player.location : '';

        var html = [];
        html.push('<div id="top"><img class="blur" src="' + player.avatar_url + '" alt=""><div id="return"><span class="close">X</span></div><a class="profile_image" href="' + player.html_url + '" target="_blank"><img src="' + player.avatar_url + '" alt=""></a>');
        html.push('<h3 id="name">' + player.name + '</h3>');
        html.push('<h3 id="city">' + location + '</h3></div>');
        html.push('<ul id="profile_data"><li id="n_shots"><span class="number"><a href="' + player.html_url + '" target="_blank">' + player.shots_count + '</a></span><b class="text">Shots</b></li>');
        html.push('<li id="n_following"><span class="number"><a href="http://dribbble.com/' + player.username + '/following" target="_blank">' + player.followings_count + '</a></span><b class="text">Following</b></li>');
        html.push('<li id="n_followers"><span class="number"><a href="http://dribbble.com/' + player.username + '/followers" target="_blank">' + player.followers_count + '</a></span><b class="text">Followers</b></li></ul>');
        //html.push('<li id="n_draftees"><span class="number">' + player.rebounds_count + '</span><b class="text">Rebounds</b></li>');
        //html.push('<div id="profile_pixels"><span class="number_pixels">' + player.shots_count * 120000 + '</span><b class="text_pixels">Pixels Dribbbled</b></div>');

        $('#detail').html(html.join(''));
    }


    function printPlayerShotTPL(playerShots) {
        //SHOT IO
        //console.log(playerShots)
        if (typeof playerShots !== 'undefined' && playerShots.length > 0) {
            // the array is defined and has at least one element
            var latestShot = '<a href="' + playerShots[0].html_url + '" target="_blank"><img class="shot-image" src="' + playerShots[0].images.normal + '" alt="' + playerShots[0].title + '"></a>';
            var latestShotTitle = playerShots[0].title;
        } else {
            var latestShot = '';
            var latestShotTitle = '<span class="no-shot">User is not playing</span>';
        }
        var html = [];
        html.push('<div id="latest_shot">' + latestShot + '<h3>' + latestShotTitle + '</h3></div>');

        $('#detail').append(html.join(''));
    }


    //*****************************
    // UX INTERACTION
    //*****************************

    function showDetail() {
        $('#detail').fadeIn().animate({marginLeft: "0%"}, 100, function () {
            // Animation complete.
            $('body').height(380);
        });

    }

    function hideDetail() {
        $('#detail').animate({display: "block", marginLeft: "100%"}, 25).fadeOut();
        $('#detail').html('');
        $('body').height('');
    }

    //*****************************
    // STORING UTILS
    //*****************************

    function playerIDExists(playerId) {
        return storedPlayers.some(function (el) {
            return el.player_id === playerId;
        });
    }

    function playerNameExists(playerId) {
        return storedPlayers.some(function (el) {
            return el.player_name === playerId;
        });
    }

    function returnStoredKeybyName(playerId) {
        for (var i = 0, len = storedPlayers.length; i < len; i++) {
            if (storedPlayers[i].player_name === playerId)
                return i;//player is stored
        }
        return false;//player is not stored
    }

    function returnStoredKeybyID(playerId) {
        for (var i = 0, len = storedPlayers.length; i < len; i++) {
            if (storedPlayers[i].player_id === playerId)
                return i;//player is stored
        }
        return false;//player is not stored
    }



})(jQuery);