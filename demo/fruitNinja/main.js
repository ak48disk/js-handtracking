chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', { 'width': 750, 'height': 500});
});

