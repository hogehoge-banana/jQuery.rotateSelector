
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
			centerY: 150,
			speed: 200,
			disabled: false,
			oblateness: 0.5,

			onchange: null,
			onselected: null,

			debug: false
		},

		frontElementIndex: null,

		offset : Math.PI / 2,
		currentRadian : Math.PI / 2,

		// Whether we drag
		canceled: false,

		// 1: ui 2: auto
		animateState:0,

		// last updated
		updated : 0,
		// animate target
		animateTarget : 0,
		// animation orientation
		orthodromic: true,
		// interval between each object
		interval: 0,

		startPoint: {
			x:0,
			y:0
		},

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

			this.options = options;

			this.init();
		},

		init: function () {
			var self = this;

			this.elementWrapper.css({
				"overflow": "hidden"
			});
			this.elementWrapper.children("ul").css({position: "relative"});
			this.selections.css({
				position: "absolute",
				"list-style-type" : "none"
			});

			this.setPoint(this.currentRadian);
			this.animateTarget = this.currentRadian;

			this.elementWrapper.bind(
					'touchstart.rotateSelector mousedown.rotateSelector keydown.rotateSelector',
					function (event) {
						self.uiStartHandler(event);
					})
				.bind('touchend.rotateSelector mouseup.rotateSelector mouseleave.rotateSelector keyup.rotateSelector',
					function (event) {
						self.uiEndHandler(event);
					});
		},
		selected: function () {
			return  $(this.selections.get(this.frontElementIndex));
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

			var current = this.currentRadian - this.offset;
			var index = parseInt(current / this.interval)
			var indexAbs = Math.abs(index);
			var mod = current % this.interval;

			index += Math.round(mod / this.interval);

			this.animateTarget = (index * this.interval) + this.offset;

			this.orthodromic = this.animateTarget > this.currentRadian;
			this.startAuto();

		},
		startAuto: function () {

			this.animateState = 2;
			this.updated = (new Date()).getTime();
			clearTimeout(this.mainLoopTimer);
			this.mainLoop();


		},

		uiStartHandler:  function (e) {

			e.preventDefault();

			this.debugEvents(e);


			if (e.originalEvent.touches) {
				var touches = e.originalEvent.touches;
				this.startUserControl(touches[0].pageX, touches[0].pageY, e.timeStamp);
			} else {
				this.startUserControl(e.pageX, e.pageY, e.timeStamp);
			}

		},

		uiEndHandler:  function (e) {

			e.preventDefault();

			this.debugEvents(e);

			this.endUserControl(e);
		},

		endUserControl: function(x, y, timestamp) {

			if (1 == this.animateState) {

				this.animateState = 0;
				this.elementWrapper.unbind('touchmove.rotateSelector mousemove.rotateSelector');

				if (!this.canceled) {
					this.lastPoint.x = this.startPoint.x;
					this.uiUpdate(16);

					if (null != this.options.onselected && $.isFunction(this.options.onselected)) {
						this.options.onselected(this.selected());
					}

				} else {

					this.scrollBack();
				}
			}

			return this;
		},

		startUserControl: function(x, y, timeStamp) {

			this.canceled = false;

			this.lastPoint.x = x;
			this.lastPoint.timeStamp = timeStamp;
			this.updatedPoint.x = this.lastPoint.x;

			this.startPoint.x = x;
			this.startPoint.y = y;

			this.animateState = 1;

			var self = this;
			this.elementWrapper.bind('touchmove.rotateSelector mousemove.rotateSelector', function(event) {
				self.debugEvents(event);

				if (event.originalEvent.touches) {
					var touches = event.originalEvent.touches;
					self.drag(touches[0].pageX, touches[0].pageY, event.timeStamp);
				} else {
					self.drag(event.pageX, event.pageY, event.timeStamp);
				}

			});

			clearTimeout(this.mainLoopTimer);
			this.mainLoop();

			return this;
		},

		drag: function (x, y, timeStamp) {

			if ((Math.max(x, this.startPoint.x) - Math.min(x, this.startPoint.x)) > 5 ||
					(Math.max(y, this.startPoint.y) - Math.min(y, this.startPoint.y)) > 5) {

				this.canceled = true;
			}

			this.orthodromic = x < this.lastPoint.x;

			var dt = timeStamp - this.lastPoint.timeStamp;
			var dif = 0;

			if (this.orthodromic) {
				dif = this.lastPoint.x - x;
			} else {
				dif = x - this.lastPoint.x;
			}


			this.mouseSpeed = dif / dt;

			this.lastPoint.x = x;
			this.lastPoint.timeStamp = timeStamp;
		},

		setPoint: function (offset) {
			var self = this;

			this.currentRadian = offset;

			var base = offset;
			var interval = this.interval,
				radius = this.options.radius;

			var maxZIndex = 0;
			var frontElementIndex = null;

			this.selections.each(function (i) {

				var r = base + (i * interval);

				var y = self.options.centerY + ((Math.sin(r) * radius) * self.options.oblateness);

				var x = self.options.centerX + Math.cos(r) * radius;

				var elem = $(this);
				elem.setPoint({
					x:x,
					y:y
				});

				var zIndex =  ~~ y;
				elem.css({'z-index': zIndex});

				if (maxZIndex < zIndex) {
					maxZIndex = zIndex;
					frontElementIndex = i;
				}
			});

			if (this.frontElementIndex != frontElementIndex) {
				this.frontElementIndex = frontElementIndex;

				if (null != this.options.onchange && $.isFunction(this.options.onchange)) {
					this.options.onchange(this.selected());
				}
			}
		},

		autoAdjust: function (dt) {

			if (this.animateState != 2) {
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
				this.animateState = 0;
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

		},

		mainLoop: function () {

			var self = this;

			if (0 < this.animateState) {
				this.mainLoopTimer = setTimeout(function () {
					self.mainLoop();
				}, 16);
			}

			var currentTime = (new Date()).getTime();

			var dt = currentTime - this.updated;

			switch (this.animateState) {
			case 1: // ui
				this.uiUpdate(dt);
				break;

			case 2: // auto adjust
				this.autoAdjust(dt);
				break;
			}

			this.updated = currentTime;

			// debug
			this.debugMainloop(dt);
		},


		lastDebug: 0,
		debugMainloop: function (dt) {
/*
			this.lastDebug += dt;

			if (this.lastDebug > 500) {
				this.lastDebug = 0;
				var fps = 1000 / dt;
				$('#fps').html(fps);
			}

			$('#currentR').html(this.currentRadian);
*/
		},

		debugEvents: function (event) {

		}
	};

	rotateSelector.prototype.create.prototype = rotateSelector.prototype;

})(jQuery);
