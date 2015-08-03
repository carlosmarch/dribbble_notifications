document.addEventListener('DOMContentLoaded', init);

function init(){
  restore_options();
  document.getElementById('save').addEventListener('click', save_options);
}
function restore_options() {
  chrome.storage.sync.get({
    showNotifications: true,
    clearActivity: true,
    intervalTimeout: 5000

  }, function(items) {
    document.getElementById('notifications').checked = items.showNotifications;
    document.getElementById('clear').checked = items.clearActivity;
    document.getElementById('interval').options[document.getElementById('interval').selectedIndex].value = items.intervalTimeout;

  });
}

function save_options() {
  var showNotifications = document.getElementById('notifications').checked;
  var clearActivity = document.getElementById('clear').checked;
  var intervalTimeout = document.getElementById('interval').options[document.getElementById('interval').selectedIndex].value;

  chrome.storage.sync.set({
    showNotifications: showNotifications,
    clearActivity: clearActivity,
    intervalTimeout: intervalTimeout
  }, function() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    status.className = 'block';
    setTimeout(function() {
      status.textContent = '';
      status.className = '';
    }, 750);
  });
}
