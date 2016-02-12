/*
 * Copyright (c) 2015. Carlos March
 * Default options generated the first time on background.js
 * When user comes to options there must be set default values
 * Then user can redefine options
 */

document.addEventListener('DOMContentLoaded', init);

function init(){
  restore_options();
  document.getElementById('save').addEventListener('click', save_options);
}


//On Init Print in DOM the Storage Values
function restore_options() {
  chrome.storage.sync.get(null, function (items) {
    //console.log('storage items:', items)
    try {
      if (chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
      } else {
        //console.log(Object.getOwnPropertyNames(items));
        // console.log(JSON.stringify(items));
        if (items.showNotifications) {
          document.getElementById('notifications').checked = items.showNotifications;
        }
        if (items.clearActivity) {
          document.getElementById('clear').checked = items.clearActivity;
        }
        if (items.intervalTimeout) {
          document.getElementById('interval').value = items.intervalTimeout;
        }
      }
    } catch (exception) {
      //window.alert('exception.stack: ' + exception.stack);
      console.error((new Date()).toJSON(), "exception.stack:", exception.stack);
    }
  });
}


// Save selected options
function save_options() {
  //get current values from DOM
  var showNotifications = document.getElementById('notifications').checked;
  var clearActivity = document.getElementById('clear').checked;
  var intervalTimeout = document.getElementById('interval').value;

  //set storage values to user DOM selection
  chrome.storage.sync.set({
    showNotifications: showNotifications,
    clearActivity: clearActivity,
    intervalTimeout: intervalTimeout
  }, function() {
    //show save feedback
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    status.className = 'block';
    setTimeout(function() {
      status.textContent = '';
      status.className = '';
    }, 750);
  });

  //send save message
  chrome.runtime.sendMessage({
    method: 'save',
    showNotifications: showNotifications,
    clearActivity: clearActivity,
    intervalTimeout: intervalTimeout
  }, function (response) {
    //console.log(response);
  });

}




