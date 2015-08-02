// Copyright (c) 2015. Carlos March

(function($) {

    var seconds=5000;
    var interval_id;


    (function check() {
        console.log('Checking for Dribbble activity...');

        clearInterval(interval_id);
        interval_id = setInterval(check, seconds);

        req = new XMLHttpRequest();
        req.open('GET', 'http://dribbble.com');
        req.onload = init;
        req.send();
    })();

    

    function init() {
        var data = req.responseText;
        var itemslist = $(data).find('.activity-mini');

        if(!itemslist.length){
            //can't retrieve activity list
            loginFirst();
        }else{
            checkNews(data);
            printList(data);
        }
    };

    function loginFirst(){
        $('#container .load').html('Log in first!');
    };

    function printList(data){

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


    function getPlayerData(playerId){
        if(typeof playerId === 'string'){
            getPlayerBio(playerId, printPlayerBioTPL);
            getPlayerShots(playerId, printPlayerShotTPL);
        }else{
            //error - is player undefined
            printErrorTPL();
        }
    };

    /**
    *
    * JRIBBBLE API CALL 
    *
    *
    */

    $.jribbble.setToken('a856179b187e185d438d1fd24d3d5408b57e52bb3d8607b8fdeeda9239c14278');


    function getPlayerBio(playerId, callback){
        $.jribbble.users(playerId).then(callback);
    }

    function getPlayerShots(playerId, callback) {
        $.jribbble.users(playerId).shots().then(callback);
    }

    function fillNotification(newerActivityplayerId, newerActivityText) {
        $.jribbble.users(newerActivityplayerId).then(success, error);

        function success(player) {
            manageNews(player, newerActivityText);
        };

        function error(jqxhr) {
            //err
        };

    }

    /**
    *
    * NOTIFICATIONS
    *
    *
    */
    
    function checkNews(data){
        //reading the html
        var newerActivity = $(data).find('.activity-mini li:first');
        var newerActivityText = newerActivity.text().replace(/(\r\n|\n|\r)/gm,"");
        var newerActivityplayerId = $(newerActivity).find('a[href]')[0].pathname.replace('/','');

        var news = $(data).find('.new-activity');


        if (news.length) {
            //console.log('there are news!');
            fillNotification(newerActivityplayerId, newerActivityText);

        }else{
            clearBadge();
        }
    }

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
                showNotification(player, newerActivityText)
            }
        }
        
        
    };

    function showBadge(){
        chrome.browserAction.setBadgeText({text: 'NEW'});
        chrome.browserAction.setBadgeBackgroundColor({color:'#ea4c89'});
        $(".see-all").text('Check & Clear the badge!');
    }

    function clearBadge(){
        chrome.browserAction.setBadgeText({text: ''});
        $(".see-all").text('See all incoming activity');
    }

    var showNotification = function (player, newerActivityText) {

      var notifId = player.username

      chrome.notifications.create( notifId ,{   
          type      : "basic",
          title     : player.username,
          message: newerActivityText,
          iconUrl   : player.avatar_url
          // buttons: [
          //   { title: 'Go' },
          //   { title: 'Ignore' }
          // ]
      }, function() {
          ///created
        });
          
    }


    /* Respond to the user's clicking on the notification message-body */
    chrome.notifications.onClicked.addListener(function(notifId) {
            chrome.tabs.create({'url': 'http://dribbble.com/activity'}, function() {
                // Tab opened.
                clearBadge();
                destroyDesktopNotification(notifId);
            });
            
    });

    chrome.notifications.onClosed.addListener(function(notifId) {
            destroyDesktopNotification(notifId);
    });
    chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
            if (btnIdx === 0) {
                chrome.tabs.create({'url': 'http://dribbble.com/activity'}, function() {
                    // Tab opened.
                    clearBadge();
                    destroyDesktopNotification(notifId);
                });
            } else if (btnIdx === 1) {
                destroyDesktopNotification(notifId);
            }
    });

    function destroyDesktopNotification(notifId){
      chrome.notifications.clear(notifId);
    }


    /**
    *
    * TEMPLATES & PRINT DATA
    *
    *
    */

    var printPlayerBioTPL = function (player){
        //PROFILE INFO
        console.log(player)
          var html = [];
        html.push('<div id="top"><div id="return"><span class="close">X</span></div><a class="profile_image" href="' + player.html_url + '" target="_blank"><img src="' + player.avatar_url + '" alt=""></a>');
          html.push('<h3 id="name">' + player.name + ' / ' + player.location + '</h3></div>');
        html.push('<ul id="profile_data"><li id="n_shots"><span class="number"><a href="' + player.html_url + '" target="_blank">' + player.shots_count + '</a></span><b class="text">Shots</b></li>');
        html.push('<li id="n_following"><span class="number"><a href="http://dribbble.com/' + player.username + '/following" target="_blank">' + player.followings_count + '</a></span><b class="text">Following</b></li>');
          html.push('<li id="n_followers"><span class="number"><a href="http://dribbble.com/' + player.username + '/followers" target="_blank">' + player.followers_count + '</a></span><b class="text">Followers</b></li>');
          //html.push('<li id="n_draftees"><span class="number">' + player.rebounds_count + '</span><b class="text">Rebounds</b></li>');
          html.push('</ul><div id="profile_pixels"><span class="number_pixels">' + player.shots_count*120000 + '</span><b class="text_pixels">Pixels Dribbbled</b></div>');
          
          $('#detail').html( html.join('') );
    }


    function printPlayerShotTPL(playerShots){
        //SHOT INFO
        console.log(playerShots)
        var html = [];
        html.push('<div id="latest_shot"><a href="' + playerShots[0].html_url + '" target="_blank"><img class="shot-image" src="' + playerShots[0].images.normal + '" ');
        html.push('alt="' + playerShots[0].title + '"></a><h3>' + playerShots[0].title + '</h3></div>');

        $('#detail').append( html.join('') );
    }

    function printErrorTPL(){
      $('#detail').html('<div id="return"><span class="close">X</span></div><div class="err">It seems that something went wrong...<div>')
                  .fadeIn().animate({ marginLeft: "0%"} , 25);
    }


    /**
    *
    * UX INTERACTION
    *
    *
    */

    function showDetail(){
      $('#detail').fadeIn().animate({ marginLeft: "0%"} , 100, function() {
        // Animation complete.
        $('body').height(380);
      });
      
    }

    function hideDetail(){
      $('#detail').animate({ display:"block", marginLeft: "100%"} , 25).fadeOut();
      $('#detail').html('');
      $('body').height('');
    }



    /**
    *
    * EVENTS
    *
    *
    */
    
    function isRendered(data){
        
        //get info & send to details section
        $('.activity-mini li:not(:last-child)').click(function() {
              var type        = $(this).attr('class');
              var cellInfo    = $(this).html();
              var playerId    = $(this).find('a[rel^=contact]').attr('href').split("/")[3];

              getPlayerData(playerId);
              showDetail();
        });


        /* Refresh when visit incoming activity */
        $('.see-all').click(function(){
              setTimeout(check, 2000);
        });

        /* Hide detail on click return */
        $(document).click(function() {
              $(event.target).closest("#return").each(function(){
                hideDetail();
              });
        });

    }


})(jQuery);