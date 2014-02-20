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

HT.Tracker = function(params){
  this.params = params || {};

  this.mask = new CV.Image();
  this.eroded = new CV.Image();
  this.contours = [];
  
  this.skinner = new HT.Skinner();
};

HT.Tracker.prototype.detect = function(image){
  this.skinner.mask(image, this.mask);
  
  if (this.params.fast || true){
    this.blackBorder(this.mask);
  }else{
    CV.erode(this.mask, this.eroded);
    CV.dilate(this.eroded, this.mask);
  }

  this.contours = CV.findContours(this.mask);

  var candidate = this.findCandidate(this.contours, image.width * image.height * 0.05, 0.005);
  if (candidate)
	  candidate.gravity = this.mask.gravity;
  return candidate;
};

HT.Tracker.prototype.findCandidate = function(contours, minSize, epsilon){
  var contour, candidate;
  
  contour = this.findMaxArea(contours, minSize);
  if (contour){
    contour = CV.approxPolyDP(contour, contour.length * epsilon);
  
    candidate = new HT.Candidate(contour);
  }
  
  return candidate;
};

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

HT.Candidate = function(contour){
  this.contour = contour;
  this.hull = CV.convexHull(contour);
  this.defects = CV.convexityDefects(contour, this.hull);
};

HT.Skinner = function(){
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
    /*r = src[i];
    g = src[i + 1];
    b = src[i + 2];
  
    v = Math.max(r, g, b);
    
    s = v === 0? 0: 255 * ( v - Math.min(r, g, b) ) / v;
    h = 0;
    
    if (0 !== s){
      if (v === r){
        h = 30 * (g - b) / s;
      }else if (v === g){
        h = 60 + ( (b - r) / s);
      }else{
        h = 120 + ( (r - g) / s);
      }
      if (h < 0){
        h += 360;
      }
    }
    */
    value = 0;

    if (v >= 100){
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
