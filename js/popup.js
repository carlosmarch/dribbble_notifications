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
          var news      = $(data).find('.new-activity');
          
          //insert
          $('#container').html(itemslist);

          //add plus icon
          $('#container ul li:not(:last-child)').each(function(){
              $(this).append('<div class="more-info"><span class="plus">+</span></div>');
          });

          //fix url
          $('#container ul.activity-mini li a').each(function() {
              $(this).attr('href', 'http://dribbble.com' + $(this).attr('href')).attr("target","_blank");
          });
         
          isRendered();
          
    };


    function getPlayerData(playerId){
        if(typeof playerId === 'string'){
            getPlayerBio(playerId, printPlayerBioTPL);
            getPlayerShots(playerId);   
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

    function getPlayerBio(playerId, callback){
        $.jribbble.getPlayerById(playerId, callback );
    };

    function getPlayerShots(playerId){
        $.jribbble.getShotsByPlayerId( playerId, function (playerShots) {
              var userHasShots = playerShots.shots.length > 0;         
              if( userHasShots ){
                  //User is playing
                  printPlayerShotTPL( playerShots );
              }else{
                  //User doesn't have shots
                  printUserNotPlayingTPL( playerId );
              }
        });
    };

    function getPlayerBioExtraInfo(playerId, extraData){
        $.jribbble.getPlayerById(playerId, function (player) {
            //console.log(player.message)
            var notiText  =  extraData;
            showPlayerNotification(player,notiText)
        });
    }


    function isPlayer(playerId){
        $.jribbble.getShotsByPlayerId( playerId, function (playerShots) {
              var userHasShots = playerShots.shots.length > 0;       
              if( userHasShots ){
                  return true;
              }else{
                  return false;
              }
        });
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


        if( !news.length ){
            
            manageNews(newerActivityplayerId , newerActivityText);

        }else{
            clearBadge();
        }
    }

    function manageNews(newerActivityplayerId , newerActivityText){
        //console.log('there are news!');
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
                  //show Notification default or rich
                  //@TODO recive photo here
                  if ( isPlayer(newerActivityplayerId) ){
                    //set custom notification
                    getPlayerBioExtraInfo( newerActivityplayerId, newerActivityText );
                  }else{
                    //set default notification
                    showDefaultNotification( newerActivityplayerId, newerActivityText )
                  }
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

    var showPlayerNotification = function (player,notiText){
      var notifId = player.username
      chrome.notifications.create( notifId ,{   
          type      : "basic",
          title     : player.username,
          message   : notiText,
          iconUrl   : player.avatar_url
          // buttons: [
          //   { title: 'Go' },
          //   { title: 'Ignore' }
          // ]
      }, function() {
          ///created
        });
          
    }

    var showDefaultNotification = function (player,notiText){
      var notifId = player;
      chrome.notifications.create( notifId ,{   
          type      : "basic",
          title     : player,
          message   : notiText,
          iconUrl   : 'images/icon48.png'
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
          var html = [];
          html.push('<div id="top"><div id="return"><span class="close">X</span></div><a class="profile_image" href="' + player.url + '" target="_blank"><img src="' + player.avatar_url + '" alt=""></a>');
          html.push('<h3 id="name">' + player.name + ' / ' + player.location + '</h3></div>');       
          html.push('<ul id="profile_data"><li id="n_shots"><span class="number"><a href="' + player.url + '" target="_blank">' + player.shots_count + '</a></span><b class="text">Shots</b></li>');
          html.push('<li id="n_following"><span class="number"><a href="http://dribbble.com/' + player.username + '/following" target="_blank">' + player.following_count + '</a></span><b class="text">Following</b></li>');
          html.push('<li id="n_followers"><span class="number"><a href="http://dribbble.com/' + player.username + '/followers" target="_blank">' + player.followers_count + '</a></span><b class="text">Followers</b></li>');
          //html.push('<li id="n_draftees"><span class="number">' + player.rebounds_count + '</span><b class="text">Rebounds</b></li>');
          html.push('</ul><div id="profile_pixels"><span class="number_pixels">' + player.shots_count*120000 + '</span><b class="text_pixels">Pixels Dribbbled</b></div>');
          
          $('#detail').html( html.join('') );
    }


    function printPlayerShotTPL(playerShots){
        //DETAIL PROFILE INFO - SHOT INFO IN BOTTOM
        var html = [];      
        html.push('<div id="latest_shot"><a href="' + playerShots.shots[0].url + '" target="_blank"><img class="shot-image" src="' + playerShots.shots[0].image_teaser_url + '" ');
        html.push('alt="' + playerShots.shots[0].title + '"></a><h3>' + playerShots.shots[0].title + '</h3></div>');
        
        $('#detail').append( html.join('') );
    }
                      

    function printUserNotPlayingTPL(playerId){
        var html = [];
        html.push('<div id="return"><span class="close">X</span></div><div class="err">It seems that ');
        html.push('<a href="http://dribbble.com/' + playerId + '" target="_blank">' + playerId + ' </a> is not playing at dribble...<div>');
        $('#detail').html( html.join('') );
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