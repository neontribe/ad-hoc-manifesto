var chromalay = window.chromalay || (function(){
    var canvas, context, video, width, height, hsl, raf, gum_stream; overlay_active = false;
    var config = Reveal.getConfig().chromalay;
    config.target = config.target || '.slides';
    config.shortcut = config.shortcut || 'c';
    config.picker = config.picker || 'g';
    config.color = JSON.parse(localStorage.getItem('chromalay')) || {
        ht: 180,
        hb: 70,
        st: 100,
        sb: 1,
        lt: 100,
        lb: 1
    };

    function startOverlay(){
        var target = document.querySelector(config.target);
        width = target.clientWidth;
        height = target.clientHeight;

        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'relative';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style['z-index'] = 9999999;
        canvas.id = "c";
        target.appendChild(canvas);
        context = canvas.getContext("2d");

        video = document.createElement('video');
        video.width = width;
        video.height = height;
        video.style.display = 'none';
        video.id = "v";
        document.body.appendChild(video);
        navigator.getUserMedia({video: true}, function(stream){
            gum_stream = stream;
            video.src = URL.createObjectURL(stream);
            video.play();
            // Ready? Start drawing
            requestAnimationFrame(draw);
        }, function () {});
    }

    function stopOverlay() {
        video.pause();
        video.src = '';
        gum_stream.getTracks().forEach(function(track){
            track.stop();
        });
        video.remove();
        canvas.remove();
    }

    function toggleOverlay() {
        if (!toggleOverlay.active) {
            startOverlay();
            toggleOverlay.active = true;
        } else {
            stopOverlay();
            toggleOverlay.active = false;
        }
    }

    function toggleSliders () {
        var vals = ['ht', 'hb', 'st', 'sb', 'lt', 'lb'];
        if (!config.sliders_active) {
            vals.forEach(function(val, i){
                var input = document.createElement('input');
                input.type = 'range';
                input.value = config.color[val];
                input.min = 0;
                input.max = val[0] === 'h' ? 360 : 100;
                input.step = 1;
                input.style.position = 'fixed';
                input.style.top = i*20 + 'px';
                input.style.left = '0px';
                input.id = val;
                input.onchange = function(evt){
                    config.color[val] = parseInt(evt.target.value);
                    localStorage.setItem('chromalay', JSON.stringify(config.color));
                }
                document.body.appendChild(input);
            });
            config.sliders_active = true;
        } else {
            vals.forEach(function(val){
                document.getElementById(val).remove();
            })
            config.sliders_active = false;
        }


    }


    Reveal.addEventListener('ready', function(event){
        console.log(event, config, Reveal);
        // Open the notes when the 'c' key is hit
		document.addEventListener( 'keypress', function( event ) {
			// Disregard the event if the target is editable or a
			// modifier is present
			if ( document.querySelector( ':focus' ) !== null || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey ) return;

			// Disregard the event if keyboard is disabled
			if ( Reveal.getConfig().keyboard === false ) return;

			if( (event.keyCode || event.which) === config.shortcut.charCodeAt(0) ) {
				event.preventDefault();
                toggleOverlay();
			}

            if( (event.keyCode || event.which) === config.picker.charCodeAt(0) ) {
				event.preventDefault();
                toggleSliders();
			}
		}, false );

        Reveal.registerKeyboardShortcut(config.shortcut || 'c', 'Toggle Chromalay');
        Reveal.registerKeyboardShortcut(config.picker || 'g', 'Toggle Chromalay Config');
    });

    function draw() {
        var frame = readFrame();

        if (frame) {
            replaceGreen(frame.data);
            context.putImageData(frame, 0, 0);
        }

        if (toggleOverlay.active) {
            requestAnimationFrame(draw);
        }

    }

    function readFrame() {
        try {
            context.drawImage(video, 0, 0, width, height);
        } catch (e) {
            // The video may not be ready, yet.
            return null;
        }

        return context.getImageData(0, 0, width, height);
    }

    function replaceGreen(data) {
        var len = data.length;

        for (var i = 0, j = 0; j < len; i++, j += 4) {
            // Convert from RGB to HSL...
            var hsl = rgb2hsl(data[j], data[j + 1], data[j + 2]);
            var h = hsl[0], s = hsl[1], l = hsl[2];

            // ... and check to see if the pixel falls in our configured bounds
            if (h >= config.color.hb && h <= config.color.ht && s >= config.color.sb && s <= config.color.st && l >= config.color.lb && l <= config.color.lt) {
                data[j + 3] = 0;
            }
        }
    }

    function rgb2hsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;

        var min = Math.min(r, g, b);
        var max = Math.max(r, g, b);
        var delta = max - min;
        var h, s, l;

        if (max == min) {
            h = 0;
        } else if (r == max) {
            h = (g - b) / delta;
        } else if (g == max) {
            h = 2 + (b - r) / delta;
        } else if (b == max) {
            h = 4 + (r - g) / delta;
        }

        h = Math.min(h * 60, 360);

        if (h < 0) {
            h += 360;
        }

        l = (min + max) / 2;

        if (max == min) {
            s = 0;
        } else if (l <= 0.5) {
            s = delta / (max + min);
        } else {
            s = delta / (2 - max - min);
        }

        return [h, s * 100, l * 100];
    }
})();

// Shim for requestAnimationFrame and getUserMedia
(function (win, nav) {
  "use strict";

  win.requestAnimationFrame = win.requestAnimationFrame ||
                              win.msRequestAnimationFrame ||
                              win.mozRequestAnimationFrame ||
                              win.webkitRequestAnimationFrame;

  nav.getUserMedia = nav.getUserMedia ||
                     nav.oGetUserMedia ||
                     nav.msGetUserMedia ||
                     nav.mozGetUserMedia ||
                     nav.webkitGetUserMedia;

  // Fallback for browsers that don't provide
  // the requestAnimationFrame API (e.g. Opera).
  if (!win.requestAnimationFrame) {
    win.requestAnimationFrame = function (callback) {
      setTimeout(callback, 0);
    };
  }

  // Fallback for browsers that don't provide
  // the URL.createObjectURL API (e.g. Opera).
  if (!win.URL || !win.URL.createObjectURL) {
    win.URL = win.URL || {};
    win.URL.createObjectURL = function (obj) {
      return obj;
    };
  }

})(window, navigator);
