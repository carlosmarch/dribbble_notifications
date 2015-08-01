
document.addEventListener('DOMContentLoaded', init);

function init(){
  restore_options()
  document.getElementById('save').addEventListener('click', save_options);
}
function restore_options() {
  chrome.storage.sync.get({
    showNotifications: true
  }, function(items) {
    document.getElementById('notifications').checked = items.showNotifications;
  });
}

function save_options() {
  var showNotifications = document.getElementById('notifications').checked;
  chrome.storage.sync.set({
    showNotifications: showNotifications
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
