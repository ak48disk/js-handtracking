/*
Copyright (c) 2012 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var HT = HT || {};

HT.Tracker = function(params) {
  this.params = params || {};

  this.mask = new CV.Image();
  this.eroded = new CV.Image();
  this.contours = [];

  this.skinner = new HT.Skinner();
  this.gestureDetector = new HT.GestureDetector(params);
};

HT.Tracker.prototype.detect = function(image) {
  this.skinner.mask(image, this.mask);

  if (this.params.fast || true) {
    this.blackBorder(this.mask);
  } else {
    CV.erode(this.mask, this.eroded);
    CV.dilate(this.eroded, this.mask);
  }

  this.contours = CV.findContours(this.mask);

  var candidate = this.findCandidate(this.contours, image.width * image.height * 0.05, 0.005, image.width, image.height);
  if (candidate) {
    candidate.gravity = this.mask.gravity;
    candidate.fingerGraph = this.fingerGraph;
    candidate.fingers = this.fingers;
  }
  this.gestureDetector.onFrame(candidate);
  return candidate;
};

HT.Tracker.prototype.detectMultiple = function(image) {
  this.skinner.mask(image, this.mask);
  this.blackBorder(this.mask);
  this.contours = CV.findContours(this.mask);

  var candidates = this.findCandidates(this.mask, this.contours, image.width * image.height * 0.05, 0.005);
  if (candidates && candidates.length == 1) {
    this.gestureDetector.onFrame(candidates[0]);
  }
  else {
    this.gestureDetector.onFrame();
  }
  return candidates;
}

HT.Tracker.prototype.findCandidate = function(contours, minSize, epsilon, width, height) {
  var contour, candidate;

  contour = this.findMaxArea(contours, minSize);
  if (contour) {
    if (this.params.fingers) {
      this.fingerGraph = this.findFingerGraph(contour, this.mask.gravity);
      this.fingers = this.findFingers(this.fingerGraph, width, height);
    }

    contour = CV.approxPolyDP(contour, contour.length * epsilon);

    candidate = new HT.Candidate(contour);
    candidate.imageWidth = width;
    candidate.imageHeight = height;
  }

  return candidate;
};

HT.Tracker.prototype.findCandidates = function(image, contours, minSize, epsilon) {
  contours = this.findSuitableContours(contours, minSize);
  var candidates = [], candidate;
  for (var i = 0; i < contours.length; ++i) {
    var contour = contours[i];
    candidate = new HT.Candidate(contour);
    candidate.imageWidth = image.width;
    candidate.imageHeight = image.height;

    if (this.params.fingers) {
      candidate.gravity = this.findGravity(image, contour);
      candidate.fingerGraph = this.findFingerGraph(contour, candidate.gravity);
      candidate.fingers = this.findFingers(candidate.fingerGraph, image.width, image.height);
    }

    contour = CV.approxPolyDP(contour, contour.length * epsilon);

    candidates.push(candidate);
  }
  return candidates;
}


HT.Tracker.prototype.findGravity = function(image, contour) {
  var i = 1, xmin, ymin, xmax, ymax;
  var width = image.width;
  var x, y, img = image.data;
  if (contour.length > 0) {
    xmin = xmax = contour[0].x;
    ymin = ymax = contour[0].y;
  }
  else {
    return;
  }
  for (; i < contour.length; ++i) {
    x = contour[i].x;
    if (x < xmin) {
      xmin = x;
    }
    if (x > xmax) {
      xmax = x;
    }

    y = contour[i].y;
    if (y < ymin) {
      ymin = y;
    }
    if (y > ymax) {
      ymax = y;
    }
  }
  var pos, gravity_x = 0, gravity_y = 0, pts = 0;

  for (y = ymin; y < ymax; ++y) {
    pos = y * width + xmin;
    for (x = xmin; x < xmax; ++x) {
      if (img[pos] > 0) {
        gravity_x += x;
        gravity_y += y;
        pts++;
      }
      ++pos;
    }
  }

  return {
    x: gravity_x / pts,
    y: gravity_y / pts
  };
}

HT.Tracker.prototype.findSuitableContours = function(contours, minSize) {
  var retVal = [];
  var maxArea = -Infinity, area;
  for (var i = 0; i < contours.length; ++i) {
    area = CV.area(contours[i]);
    contours[i].area = area;
    if (area >= minSize && area > maxArea) {
      maxArea = area;
    }
  }
  for (var i = 0; i < contours.length; ++i) {
    if (contours[i].area >= maxArea * 0.5 && contours[i].area >= minSize) {
      retVal.push(contours[i]);
    }
  }
  return retVal;
}

HT.Tracker.prototype.findMaxArea = function(contours, minSize){
  var len = contours.length, i = 0,
      maxArea = -Infinity, area, contour;

  for (; i < len; ++ i){
    area = CV.area(contours[i]);
    if (area >= minSize){
    
      if (area > maxArea) {
        maxArea = area;
      
        contour = contours[i];
      }
    }
  }
  
  return contour;
};

HT.Tracker.prototype.blackBorder = function(image){
  var img = image.data, width = image.width, height = image.height,
      pos = 0, i;

  for (i = 0; i < width; ++ i){
    img[pos ++] = 0;
  }
  
  for (i = 2; i < height; ++ i){
    img[pos] = img[pos + width - 1] = 0;

    pos += width;
  }

  for (i = 0; i < width; ++ i){
    img[pos ++] = 0;
  }
  
  return image;
};


HT.Tracker.prototype.findFingerGraph = function(contour, gravity) {
  var d = [];
  var res = 500;
  var gx = gravity.x, gy = gravity.y;
  var len = contour.length, maxd = 0, mind = 10000;

  for (var i = 0; i < len; ++i) {
    var pt = contour[i];
    var dx = pt.x - gx;
    var dy = pt.y - gy;
    var dl = Math.sqrt(dx * dx + dy * dy);
    var deg = Math.acos(dx / dl);
    if (dy < 0) deg = -deg;
    var index = ~ ~((deg / Math.PI / 2 + 0.5) * res);
    if (!d[index] || d[index].value < dl) {
      d[index] = { value: dl, pt: pt };
    } 
    maxd = Math.max(dl, maxd);
    mind = Math.min(dl, mind);
  }
  var diff = maxd - mind;
  for (var i = 0; i < res; ++i) {
    if (d[i]) {
      d[i].value = (d[i].value - mind) / diff;
    }
  }
  return d;
}

HT.Tracker.prototype.findFingers = function(fingerGraph, width, height, threshold) {
  threshold = threshold || 0.55;
  var flag = 0;
  var pts = 0;
  var max, maxi;
  var result = [];
  var d = fingerGraph;
  var res = fingerGraph.length;
  for (var i = 0; i < fingerGraph.length; ++i) {
    if (d[i]) {
      if (d[i].value > threshold) {
        if (flag == false) {
          flag = true;
          max = d[i].value;
          maxi = i;
        }
        else {
          if (max < d[i].value) {
            max = d[i].value;
            maxi = i;
          }
        }
      }
      else {
        if (flag) {
          flag = false;
          result.push({
            x: d[maxi].pt.x,
            y: d[maxi].pt.y,
            l: d[maxi].value,
            a: maxi
          });
        }
      }
    }
  }
  if (flag) {
    flag = false;
    result.push({
      x: d[maxi].pt.x,
      y: d[maxi].pt.y,
      l: d[maxi].value,
      a: maxi
    });
  }
  //Filter out edge 
  result = result.filter(function(r) {
    var thw = width * 0.03;
    var thh = height * 0.03;
    if (r.x < thw || r.x > width - thw ||
        r.y < thh || r.y > height - thh) {
      return false;
    }
    return true;
  }).sort(function(a, b) { return a.a - b.a });

  var count = 0;
  var maxcount = 0; maxi = 0;
  for (var i = 0; i < result.length; ++i) {
    count = 0;
    for (var j = i + 1; j < result.length; ++j) {
      if (result[j].a - result[i].a < res * 0.6) {
        count++;
      }
    }
    if (count > maxcount) {
      maxcount = count;
      maxi = i;
    }
  }
  var result2 = [];
  for (var j = maxi; j < result.length; ++j) {
    if (result[j].a - result[maxi].a < res * 0.6) {
      result2.push(result[j]);
    }
  }
  return result2.sort(function(a, b) { return b.l - a.l; });
}

HT.Candidate = function(contour){
  this.contour = contour;
  this.hull = CV.convexHull(contour);
  this.defects = CV.convexityDefects(contour, this.hull);
};

HT.Skinner = function(params){
  this.params = params || {depthThreshold: 100};
};

HT.Skinner.prototype.mask = function(imageSrc, imageDst){
  var src = imageSrc.data, dst = imageDst.data, len = src.length,
      i = 0, j = 0,
      r, g, b, h, s, v, value;
  var gravity_x = 0, gravity_y = 0;
  var pts = 0;
  var width = imageSrc.width;
  for(; i < len; i += 4){
    v = src[i];
    value = 0;

    if (v >= this.params.depthThreshold){
        value = 255;
	      var x = j % width;
	      var y = j / width;
	      gravity_x += x;
	      gravity_y += y;
	      pts ++;
    }
    
    dst[j ++] = value;
  }
  gravity_x = gravity_x / pts;
  gravity_y = gravity_y / pts;

  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;
  imageDst.gravity = {
	  x : gravity_x,
	  y : gravity_y
	};
  return imageDst;
};

HT.GestureDetector = function(params) {
  this.params = params || {};
  this.eventListeners = {};
  this.listeners = 0;
  this.detectors = [
    new HT.GestureDetector.SwipeDetector(this, "swipeLeft", { x: -1, y: 0 }),
    new HT.GestureDetector.SwipeDetector(this, "swipeRight", { x: 1, y: 0 }),
    new HT.GestureDetector.SwipeDetector(this, "swipeUp", { x: 0, y: -1 }),
    new HT.GestureDetector.SwipeDetector(this, "swipeDown", { x: 0, y: 1 }),
    new HT.GestureDetector.NudgeDetector(this, "nudge")
  ];
}

HT.GestureDetector.prototype.addEventListener = function(event, listener) {
  this.eventListeners[event] = this.eventListeners[event] || [];
  if (this.eventListeners[event].indexOf(listener) < 0) {
    this.eventListeners[event].push(listener);
    this.listeners++;
  }
}

HT.GestureDetector.prototype.removeEventListener = function(event, listener) {
  if (this.eventListeners[event]) {
    var index = this.eventListeners[event].indexOf(listener);
    if (index >= 0) {
      this.eventListeners[event].splice(index, 1);
      this.listeners--;
    }
  }
}

HT.GestureDetector.prototype.dispatchEvent = function(event, data) {
  var arr = this.eventListeners[event];
  if (arr) {
    data.target = this;
    for (var i = 0; i < arr.length; ++i) {
      arr[i].call(this, data);
    }
  }
}

HT.GestureDetector.prototype.onFrame = function(candidate) {
  if (this.listeners > 0) {
    for (var i = 0; i < this.detectors.length; ++i) {
      this.detectors[i].onFrame(candidate);
    }
  }
}

HT.GestureDetector.Detector = function(parent, name) {
  this.parent = parent;
  this.name = name;
}

HT.GestureDetector.Detector.prototype.trigger = function() {
  this.parent.dispatchEvent("ongesture", { name: this.name });
}

HT.GestureDetector.Detector.prototype.onFrame = function(candidate) {
  //empty
}

HT.GestureDetector.SwipeDetector = function(parent, name, vector) {
  HT.GestureDetector.Detector.call(this, parent, name);
  this.state = "idle";
  this.history = [];
  this.historyIndex = 0;
  this.historyCount = 0;
  this.maxFrames = 30;
  this.vector = vector;
}

HT.GestureDetector.SwipeDetector.prototype = new HT.GestureDetector.Detector();
HT.GestureDetector.SwipeDetector.prototype.constructor = HT.GestureDetector.SwipeDetector;

HT.GestureDetector.SwipeDetector.prototype.onFrame = function(candidate) {
  if (this.state == "sleeping") {
    if (this.sleepFrames++ > 20) {
      this.state = "idle";
      return;
    }
  }
  else if (this.state == "idle" && candidate) {
    this.state = "capture";
    this.missFrames = 0;
    this.historyIndex = 0;
    this.historyCount = 0;
    this.history = [];
  }
  if (this.state == "capture") {
    if (!candidate || !candidate.fingers || candidate.fingers.length == 0) {
      if (++this.missFrames > 10) {
        this.state = "idle";
        return;
      }
    }
    else {
      var finger = candidate.fingers[0];
      var x = this.vector.x * finger.x / candidate.imageWidth;
      var y = this.vector.y * finger.y / candidate.imageHeight;
      var position = (x + y) / Math.sqrt(this.vector.x * this.vector.x + this.vector.y * this.vector.y);
      var currentIndex = this.historyIndex;
      var prevIndex = this.historyIndex;
      this.history[this.historyIndex] = position;
      this.historyIndex = (this.historyIndex + 1) % this.maxFrames;
      this.historyCount = Math.min(this.maxFrames, this.historyCount + 1);
      for (var count = 1; count < this.historyCount; ++count) {
        prevIndex = prevIndex - 1;
        if (prevIndex < 0)
          prevIndex = this.maxFrames - 1;
        if (this.history[currentIndex] - this.history[prevIndex] > 0.7) {
          this.trigger();
          this.state = "sleeping";
          this.sleepFrames = 0;
          return;
        }
      }
    }
  }
}

HT.GestureDetector.NudgeDetector = function(parent, name) {
  HT.GestureDetector.Detector.call(this, parent, name);
  this.state = "idle";
  this.history = [];
  this.historyIndex = 0;
  this.historyCount = 0;
  this.maxFrames = 10;
}

HT.GestureDetector.NudgeDetector.prototype = new HT.GestureDetector.Detector();
HT.GestureDetector.NudgeDetector.prototype.constructor = HT.GestureDetector.SwipeDetector;

HT.GestureDetector.NudgeDetector.prototype.onFrame = function(candidate) {
  if (this.state == "idle" && candidate) {
    this.state = "capture";
    this.missFrames = 0;
    this.historyIndex = 0;
    this.historyCount = 0;
    this.history = [];
  }
  if (this.state == "capture" || this.state == "wait_for_removal") {
    if (!candidate || !candidate.fingers || candidate.fingers.length == 0) {
      if (++this.missFrames > 5) {
        this.state = "idle";
        return;
      }
    } else {
      var fingers = candidate.fingers;
      if (fingers && fingers.length > 0) {
        var prevIndex = this.historyIndex;
        for (var count = 0; count < this.historyCount; ++count) {
          prevIndex = prevIndex - 1;
          if (prevIndex < 0)
            prevIndex = this.maxFrames - 1;
          var curr = this.history[prevIndex];
          var threshold;
          if (this.state == "wait_for_removal")
            threshold = 15;
          else
            threshold = 7;
          var cnt = 0;
          for (var f = 0; f < fingers.length; ++f) {
            var x = fingers[f].x;
            var y = fingers[f].y;
            if (Math.sqrt((curr.x - x) * (curr.x - x) + (curr.y - y) * (curr.y - y)) < threshold) {
              cnt++;
            }
          }
          if (this.state == "capture" && cnt == 1) {
            this.trigger();
            this.state = "wait_for_removal";
            this.removalFrames = 0;
          }
          if (cnt > 0) return;
          if (++this.removalFrames > 3 && this.state == "wait_for_removal") {
            this.parent.dispatchEvent("ongesture", { name: "I" });
            this.state = "idle";
            return;
          }
        }
        if (fingers.length > 1) {
          //find two closest fingers
          var x, y, closest = Infinity;
          for (var i = 0; i < fingers.length; ++i) {
            for (var j = i + 1; j < fingers.length; ++j) {
              var dx = fingers[i].x - fingers[j].x;
              var dy = fingers[i].y - fingers[j].y;
              var dist = dx * dx + dy * dy;
              if (dist < closest) {
                dist = closest;
                x = (fingers[i].x + fingers[j].x) * 0.5;
                y = (fingers[i].y + fingers[j].y) * 0.5;
              }
            }
          } //outer for
          this.history[this.historyIndex] = { x: x, y: y };
          this.historyIndex = (this.historyIndex + 1) % this.maxFrames;
          this.historyCount = Math.min(this.maxFrames, this.historyCount + 1);
        } // if
      }
    }
  }
}
