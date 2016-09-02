/*
*  Masquerade JS
*  
*  IP Cortex Ltd
*
*  Author: Matthew Preskett
*  Co-Author: Steve Davies
*
*  https://github.com/ipcortex/Masquerade-JS
*/

(function() {
	Class = function(definition) { 
		var Construct = function Class() {
			var object = Object.create(Inner);
			for ( var property in definition ) {
				if ( property === 'construct' )
					continue;
				if ( property.substr(0, 1) === '_' || property.substr(0, 1) === '$' )
					continue;
				if ( typeof(definition[property]) === 'object' ) {
					if ( property === 'defineProperties' ) {
						var properties = {};
						for ( var define in definition[property] ) {
							properties[define] = properties[define] || {};
							for ( var operator in definition[property][define] )
								properties[define][operator] = object['_property_' + define + '_' + operator].bind(object);
						}
						Object.defineProperties(this, properties);
					} else
						this[property] = definition[property];
				} else if ( typeof(object[property]) === 'function' )
					this[property] = object[property].bind(object);
			}
			if ( typeof(definition.construct) === 'function' ) {
				object.$public = this;
				definition.construct.apply(object, arguments);
				delete object.$public;
			}
		};

		Construct.extend = function(extension) {
			for ( var property in definition ) {
				if ( property === 'defineProperties' )
					continue;
				if ( definition.hasOwnProperty(property) && ! extension.hasOwnProperty(property))
					extension[property] = definition[property];
			}
			return new Class(extension);
		};

		/* Construct Inner from Construct so 'instanceof' works */
		var Inner = Object.create(Construct.prototype);
		for ( var property in definition ) {
			if ( ! definition.hasOwnProperty(property) )
				continue;
			if ( property.substr(0, 1) === '$' )
				Construct[property.substr(1)] = definition[property];
			else if ( property === 'defineProperties' ) {
				for ( var define in definition[property] ) {
					for ( var operator in definition[property][define] )
						Inner['_property_' + define + '_' + operator] = definition[property][define][operator];
				}
			} else if ( typeof(definition[property]) !== 'function' ) {
				var sharedStorage = {value: definition[property]};
				var getNset = {
					get:	function() { return this.value; }.bind(sharedStorage),
					set:	function(v) { this.value = v; }.bind(sharedStorage)
				};
				if ( property.substr(0, 1) !== '_' ) {
					Object.defineProperty(Construct.prototype, property, getNset);
					Object.defineProperty(Construct, property, getNset);
				} else
					Object.defineProperty(Inner, property, getNset);
			} else	/* type == 'function' */
				Inner[property] = definition[property];
		}

		Construct._isClass = true;
		return Construct;
	};

	Class._isClass = true;
})();

var Gate = new Class({
	construct:
		function(video, callback) {
			if ( ! video || video.tagName != 'VIDEO' )
				throw new Error('Invalid or missing video element!');
			if ( typeof(callback) != 'function' )
				throw new Error('Callback is not a function!');
			this.timeout = null;
			this.tracking = {};
			this.dropping = false;
			this.video = video;
			this.dropperName = null;
			this.callback = callback;
			this.div = document.createElement('div');
			this.trackCanvas = document.createElement('canvas');
			this.captureCanvas = document.createElement('canvas');
			if ( video.nextSibling )
				video.parentNode.insertBefore(this.div, video.nextSibling);
			else
				video.parentNode.appendChild(this.div);
			this.trackContext = this.trackCanvas.getContext('2d');
			this.captureContext = this.captureCanvas.getContext('2d');
			['trackCanvas', 'captureCanvas'].forEach(
				function(name) {
					this[name].style.position = 'absolute';
					this[name].height = video.offsetHeight;
					this[name].width = video.offsetWidth;
				}.bind(this)
			);
			this.captureCanvas.addEventListener('mousemove',
				function(e) {
					var rgba = this.captureContext.getImageData(e.offsetX, e.offsetY, 1, 1).data;
					this.trackContext.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
					this.trackContext.fillStyle = 'rgba(' + rgba[0] + ', ' + rgba[1] + ', ' + rgba[2] + ', 1)';
					this.trackContext.fillRect((e.offsetX + 5), (e.offsetY + 5), 50, 50);
				}.bind(this)
			);
			this.captureCanvas.addEventListener('click',
				function(e) {
					var rgba = this.captureContext.getImageData(e.offsetX, e.offsetY, 1, 1).data;
					this.trackContext.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
					this.registerColour(this.dropperName, {r: rgba[0], g: rgba[1], b: rgba[2]});
					this.captureCanvas.style.display = 'none';
					clearTimeout(this.timeout);
					this.dropperName = null;
					this.dropping = false;
				}.bind(this)
			);
			this.captureCanvas.style.display = 'none';
			this.trackCanvas.style.pointerEvents = 'none';
			this.div.style.position = 'relative';
			this.div.appendChild(this.captureCanvas);
			this.div.appendChild(this.trackCanvas);
			this.div.appendChild(video);
			video.style.pointerEvents = 'none';
			video.play();
		},
	registerColour:
		function(name, colour) {
			var colourTotalR = (colour.r + colour.g + colour.b);
			var rRatio = (colour.r / colourTotalR);
			var gRatio = (colour.g / colourTotalR);
			tracking.ColorTracker.registerColor(name,
				function(r, g, b) {
					var colourTotalT = (r + g + b);
					if ( colourTotalT == 0 ) {
						if ( colourTotalR < 10 )
							return true;
						return false;
					}
					var deltaColourTotal = (colourTotalR / colourTotalT);
					var deltaR = (rRatio / (r / colourTotalT));
					var deltaG = (gRatio / (g / colourTotalT));
					return deltaColourTotal > 0.9 && deltaColourTotal < 1.1 &&
					deltaR > 0.9 && deltaR < 1.1 &&
					deltaG > 0.9 && deltaG < 1.1;
				}
			);
			if ( ! this.tracking[name] )
				this.tracking[name] = {colour: colour, timeout: null, latched: false};
			else
				this.tracking[name].colour = colour;
			if ( ! this.tracker ) {
				this.tracker = new tracking.ColorTracker(Object.keys(this.tracking));
				this.tracker.on('track',
					function(e) {
						if ( this.dropping )
							return;
						this.trackContext.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
						e.data.forEach(
							function(detection) {
								if ( ! this.tracking[detection.color] )
									return;
								var item = this.tracking[detection.color];
								var colour = this.tracking[detection.color].colour;
								var rgba = 'rgba(' + colour.r + ', ' + colour.g + ', ' + colour.b + ', 1)';
								this.trackContext.strokeStyle = rgba;
								this.trackContext.strokeRect(detection.x, detection.y, detection.width, detection.height);
								this.trackContext.font = '11px Helvetica';
								this.trackContext.fillStyle = rgba;
								this.trackContext.fillText(detection.color, detection.x + detection.width + 5, detection.y + 11);
								clearTimeout(item.timeout);
								item.timeout = setTimeout(
									function() {
										item.latched = false;
									},
									500
								);
								if ( ! item.latched ) {
									this.callback({name: detection.color});
									item.latched = true;
								}
							}.bind(this)
						);
					}.bind(this)
				);
				tracking.track(this.video, this.tracker);
				this.tracker.setMinGroupSize(10);
				this.tracker.setMinDimension(8);
			} else
				this.tracker.setColors(Object.keys(this.tracking));
		},
	dropper:
		function(name) {
			if ( typeof(name) != 'string' )
				return 'I\'m going need a name!';
			this.dropping = true;
			this.dropperName = name;
			this.captureCanvas.style.display = null;
			var draw = function() {
				this.captureContext.drawImage(this.video, 0, 0, this.video.offsetWidth, this.video.offsetHeight);
				this.timeout = setTimeout(draw, 50);
			}.bind(this);
			draw();
		}
});
