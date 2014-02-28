//var depthRenderer = new Worker("js/src/DepthRenderer.js");

var listeners = {};
HandTracking = function(canvas_width, canvas_height) {
  var video = document.getElementById("depth");

  this.tracker = new HT.Tracker();
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");

  var shadowCanvas = document.getElementById("shadow");

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
  if (navigator.getUserMedia) {
    navigator.getUserMedia({ video: { 'mandatory': { 'depth': true}} },
          function(stream) {
            video.src = window.webkitURL.createObjectURL(stream);
            shadowCanvas.style.display="block";
            shadowCanvas.width=gameWidth;
            shadowCanvas.height=gameHeight;
            ShadowRenderer(video, shadowCanvas);
          },
          function(error) { console.log(error); });
  }

  this.tracker.params.fingers = true;

  this.tick = function() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      var image = this.snapshot();
      candidate = this.tracker.detect(image);
      if (candidate && candidate.fingers && candidate.fingers.length > 0) {
        var f = candidate.fingers.sort(function(a, b) { return a.y - b.y; });
        this.dispatchEvent('handmove', { x: (1.0 - (f[0].x / canvas.width)) * canvas_width, y: f[0].y / canvas.height * canvas_height });
      }
    }
  }

  this.snapshot = function() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return imageData;
  };

  this.addEventListener = function(type, listener) {
    if (listeners[type] === undefined) {
      listeners[type] = [];
    }

    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  };

  this.removeEventListener = function(type, listener) {
    var index = listeners[type].indexOf(listener);
    if (index !== -1) {
      listeners[type].splice(index, 1);
    }
  };

  this.removeAllEventListeners = function() {
    listeners = {};
    array = [];
  };

  this.dispatchEvent = function(type, event) {
    var listenerArray = listeners[type];
    if (listenerArray == undefined)
      return;
    event.target = this;
    array = listenerArray.slice();
    for (var i = 0, l = array.length; i < l; i++) {
      array[i].call(this, event);
    }
  };
};
