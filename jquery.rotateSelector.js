
(function($){
	// jquery custom
	$.fn.extend({
		// point : {x, y}
		//
		setPoint: function(point) {

			return this.each(function() {

				var target = $(this);
				var left = point.x - target.width() / 2;
				var top = point.y - target.height() / 2;

				target.css({top:top,left:left})
			});
		},
		getPoint: function () {

			var x = this.css('left') + (this.width() / 2);
			var y = this.css('top') + this.height();

			return {x: x, y: y};
		}
	});
	var rotateSelector,
		document = window.document,

		// Whether browser has touchScreen
		touchDevice = /iphone|ipod|ipad|android|blackberry/,

		isAndroid = /android/.test(navigator.userAgent.toLowerCase());


	$.fn.rotateSelector = rotateSelector = function(options) {

		if (typeof options === "string") { // method call
			var args = Array.prototype.slice.call(arguments, 1),
				returnValue = this;

			this.each(function() {
				var instance = $.data(this, 'rotateSelector'),
					value = instance && $.isFunction(instance[options]) ?
						instance[options].apply(instance, args) : instance;

				if (value !== instance && value !== undefined) {
					returnValue = value;
					return false;
				}
			});

			return returnValue;
		} else {
			return this.each(function() {
				var instance = $.data(this, 'rotateSelector');

				if (instance) {
					$.extend(true, instance.options, options)
					instance.init();
				} else {
					$.data(this, 'rotateSelector', new rotateSelector.prototype.create(options, this));
				}
			});
		}
	};

	rotateSelector.prototype = {
		options: {
			radius: 80,
			centerX: 300,
			centerY: 300,
			speed: 200,
			disabled: false,


			// old
			elasticConstant: 0.16,
			friction: 0.96,
			section: null
		},

		currentRadian : Math.PI / 2,

		// Whether we drag
		canceled: false,

		isAutoAdjusting: false,
		isUiControlling: false,

		// last updated
		updated : 0,
		// animate target
		animateTarget : 0,
		// animation orientation
		orthodromic: true,
		// interval between each object
		interval: 0,

		// point infomation at on drag event
		lastPoint : {
			x: 0,
			timeStamp: 0
		},
		// updated point info
		updatedPoint: {
			x: 0,
			timeStamp: 0
		},
		mouseSpeed: 0,

		currentPointedX: 0,
		mainLoopTimer : null,


		create: function(options, elem) {
			var self = this,
				element = $(elem);


			this.selections = element.find('li');
			this.interval = 2 * Math.PI / this.selections.length;
			this.elementWrapper = $(element);
			this.init();
		},

		init: function () {
			var self = this;
			this.setPoint(this.currentRadian);
			this.animateTarget = this.currentRadian;

			this.elementWrapper.bind(
					'touchstart.rotateSelector mousedown.rotateSelector keydown.rotateSelector',
					function (event) {
						self.startUserControl(event);
						event.preventDefault();
					})
				.bind('touchend.rotateSelector mouseup.rotateSelector mouseleave.rotateSelector keyup.rotateSelector',
					function (event) {
						self.endUserControl(event);
						event.preventDefault();
					});
		},

		option: function(key, value) {
			var self = this,
				options = key;

			if (arguments.length === 0) {
				return $.extend({}, this.options);
			}

			if (typeof key === "string") {
				if (value === undefined) {
					return this.options[key];
				}
				options = {};
				options[key] = value;
			}

			$.each(options, function(key, value) {
				self.setOption(key, value);
			});

			return this;
		},

		setOption: function(key, value) {
			var refresh = false;

			this.options[key] = value;

			refresh && this.refresh();
			return this;
		},

		enable: function() {
			return this.setOption('disabled', false);
		},

		disable: function() {
			return this.setOption('disabled', true);
		},

		next: function () {

			this.orthodromic = true;
			this.updated = (new Date()).getTime();

			this.animateTarget = this.animateTarget + this.interval;
			this.startAuto();
		},
		prev: function () {

			this.orthodromic = false;
			this.updated = (new Date()).getTime();

			this.animateTarget = this.animateTarget - this.interval;
			this.startAuto();

		},
		scrollBack: function () {

			var cur = Math.abs(parseInt(this.currentRadian / this.interval));
			var mod = cur % this.interval;

			if ((mod / this.interval) >= 0.5) {
				cur += this.interval;
			}


			if (0 > this.currentRadian) {
				this.animateTarget = - cur;
			} else {
				this.animateTarget = cur;
			}


			this.orthodromic = this.animateTarget > this.currentRadian;
			this.startAuto();

		},
		startAuto: function () {

			this.isUiControlling = false;
			this.isAutoAdjusting = true;
			this.updated = (new Date()).getTime();
			clearTimeout(this.mainLoopTimer);
			this.mainLoop();

			this.debugAuto();

		},
		endUserControl: function() {

			if (!this.isUiControlling) {
				return false;
			}

			clearTimeout(this.mainLoopTimer);

			this.isUiControlling = false;
			this.elementWrapper.unbind('touchmove.rotateSelector mousemove.rotateSelector');

			this.scrollBack();

			return this;
		},

		startUserControl: function(event) {


			this.lastPoint.x = event.pageX;
			this.lastPoint.timeStamp = event.timeStamp;
			this.updatedPoint.x = this.lastPoint.x;

			this.isAutoAdjusting = false;
			this.isUiControlling = true;

			var self = this;
			this.elementWrapper.bind('touchmove.rotateSelector mousemove.rotateSelector', function(event) {
				self.drag(event);
			});

			clearTimeout(this.mainLoopTimer);
			this.mainLoop();

			return this;
		},

		drag: function (event) {


			this.orthodromic = event.pageX < this.lastPoint.x;

			var dt = event.timeStamp - this.lastPoint.timeStamp;
			var dif = 0;
			if (this.orthodromic) {
				dif = this.lastPoint.x - event.clientX;
			} else {
				dif = event.clientX - this.lastPoint.x;
			}


			this.mouseSpeed = dif / dt;

			this.lastPoint.x = event.clientX;
			this.lastPoint.timeStamp = event.timeStamp;

			this.debugDrag(event.clientX, event.clientY);
		},

		setPoint: function (offset) {
			var self = this;

			this.currentRadian = offset;

			var base = offset;
			var interval = this.interval,
				radius = this.options.radius;

			this.selections.each(function (i) {

				var r = base + (i * interval);

				var y = self.options.centerY + Math.sin(r) * radius;
				var x = self.options.centerX + Math.cos(r) * radius;


				var elem = $(this);
				elem.setPoint({
					x:x,
					y:y
				});

				elem.css({'z-index': ~~ y});
			});


		},

		autoAdjust: function (dt) {

			if (!this.isAutoAdjusting) {
				return;
			}
			var dif = dt / this.options.speed;
			if (!this.orthodromic) {
				dif = - dif;
			}
			var next = dif * this.interval + this.currentRadian;


			if ((this.orthodromic && next >= this.animateTarget) ||
					(!this.orthodromic && next <= this.animateTarget)) {

				next = this.animateTarget;
				this.isAutoAdjusting = false;
			}

			this.setPoint(next);
		},
		uiUpdate: function (dt) {

			if (this.lastPoint.x == this.updatedPoint.x) {
				this.mouseSpeed = 0;

				return;
			}

			var diff = 0;
			diff = this.lastPoint.x - this.updatedPoint.x;
			var r = Math.asin(diff / this.options.radius);

			var next = -r + this.currentRadian;

			this.setPoint(next);

			this.updatedPoint.x = this.lastPoint.x;

			this.debugUi(diff,  r);
		},

		mainLoop: function () {

			var self = this;

			if (this.isUiControlling || this.isAutoAdjusting) {
				this.mainLoopTimer = setTimeout(function () {
					self.mainLoop();
				}, 16);
			}

			var currentTime = (new Date()).getTime();

			var dt = currentTime - this.updated;

			if (this.isUiControlling) {
				this.uiUpdate(dt);
			}
			if (this.isAutoAdjusting) {
				this.autoAdjust(dt);
			}

			this.updated = currentTime;

			// debug
			this.debugMainloop(dt);
		},


		debugUi: function (diff, r) {
			/*

			$('#uidebug').append("<p>dif: " + diff + ", r: " + r + ", dif/radius: " + this.options.radius / diff);

			var dragorientation = this.orthodromic? "next": "prev";
			$("#dragorientation").html(dragorientation);
			*/
		},
		debugDrag: function (x, y) {
			$("#dragx").html(x);
			$("#dragy").html(y);
		},

		debugAuto: function () {
			$('#animateTarget').html(this.animateTarget);
		},

		lastDebug: 0,
		debugMainloop: function (dt) {
			this.lastDebug += dt;

			if (this.lastDebug > 500) {
				this.lastDebug = 0;
				var fps = 1000 / dt;
				$('#fps').html(fps);
			}

			$('#currentR').html(this.currentRadian);
		}
	};

	rotateSelector.prototype.create.prototype = rotateSelector.prototype;

})(jQuery);
