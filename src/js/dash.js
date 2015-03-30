import "domready";
import "templates";

var Dash = {
	url: 'https://api.fancysupport.com/public',
	active: null,
	widgets: {},
	app: null,

	intervals: {},

	times: {
		SECOND: 1e3,
		MINUTE: 6e4,
		HOUR: 3.6e6,
		DAY: 8.64e7,
		WEEK: 6.048e8,
		YEAR: 3.1536e10
	},

	init: function() {
		// cache
		this.app = this.id('app');

		String.prototype.encodeHTML = function() {
			var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
			return function() {
				return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
			};
		}();

		this.hash_changed();

		// set up the hash change callback
		window.onhashchange = this.hash_changed.bind(this);
	},

	hash_changed: function() {
		var that = this;
		var token = window.location.hash.slice(1);
		clearInterval(this.intervals.dash_poll);

		for (var id in this.intervals) {
			if (this.intervals.hasOwnProperty(id)) {
				var timers = this.intervals[id] || [];
				for (var i=0; i<timers.length; i++) {
					clearInterval(timers[i]);
				}
			}
		}

		if (token) {
			this.get_dash(token);
			this.intervals.dash_poll = setInterval(function() {
				that.get_dash(token);
			}, 10*60*1000);
		}
		else this.render_empty();
	},

	id: function(q) {
		return document.getElementById(q);
	},

	qs: function(q) {
		return document.querySelector(q);
	},

	make_node: function(s) {
		// unsure how to just append a string to DOM
		// so take the DOM from an element and append that
		var n = document.createElement('div');
		n.innerHTML = s;
		return n.firstChild;
	},

	generate_times: function(interval) {
		var times = {
			minute: {points: 60, period: 1000},
			hour: {points: 60, period: 1000*60},
			day: {points:24, period: 1000*60*60},
			week: {points:7, period: 1000*60*60*24},
			month: {points:30, period: 1000*60*60*24},
			year: {points: 12, period: 1000*60*60*24*30}
		};

		return times[interval];
	},

	generate_layered_series: function(sources, points, period) {
		var that = this;
		var stack = [];

		var cb = function(e) {
			e[0] *= 1000; // now get seconds
			return {x: e[0], y: e[1], timeago: that.timeago(+e[0])};
		};

		for (var i=0; i<sources.length; i++) {
			var data = sources[i].data;


			stack[i] = {
				name: sources[i].name,
				colour: sources[i].colour,
				values: sources[i].data.map(cb)
			};
		}

		stack.sort(function(a,b){return a.id>b.id;});

		return stack;
	},

	init_dash: function() {
		this.render_dash();

		var d = this.active;

		document.title = d.name;

		var incomming = {};

		// handle new and modified widgets
		for (var i=0; i<d.widgets.length; i++) {
			this.init_widget(d.widgets[i]);
			incomming[d.widgets[i].id] = true;
		}

		// handle deleted widgets
		for (var id in this.widgets) {
			if (this.widgets.hasOwnProperty(id) && ! incomming[id]) {
				this.remove_widget(this.widgets[id]);
				delete this.widgets[id];
			}
		}
	},

	init_widget: function(w) {
		// remove values since we get those from the data anyway
		delete w.values;

		var n = JSON.stringify(w);
		var o = JSON.stringify(this.widgets[w.id]);

		// this is a new widget
		if (o === undefined) {
			return this.create_widget(w);
		}

		// the new widgets differs from the old widget
		if (n !== o) {
			this.remove_widget(w);
			this.create_widget(w);
		}
	},

	create_widget: function(w) {
		// assign to list to keep track easier
		this.widgets[w.id] = w;

		this.render_widget(w);

		var type = w.type.replace(/:/g, '_');
		this['generate_'+type](w);
	},

	remove_widget: function(w) {
		var timers = this.intervals[w.id] || [];
		for (var i=0; i<timers.length; i++) {
			clearInterval(timers[i]);
		}

		// remove widget and d3-tip if its there
		d3.selectAll('[data-id="' + w.id + '"]').remove();
	},

	get_dash: function(token) {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/dashboards/' + token
		}, function(ok, err) {
			if (ok && ok.data)	{
				that.active = ok.data;
				that.init_dash();
			}

			if (err && err.code === 404) {
				that.widgets = {};
				that.render_notfound();
			}
		});
	},

	get_widget_data: function(w, cb) {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/dashboards/' + this.active.token + '/widgets/' + w.id + '/data'
		}, function(ok, err) {
			// widget is gone, need to update dash
			if (err && (err.code === 404 || err.code === 400))
				return that.get_dash(that.active.token);

			cb(ok, err);
		});
	},

	ajax: function (opts, cb) {
		var that = this;

		var parse = function (req) {
			var result;
			try {
				result = JSON.parse(req.responseText);
			} catch (e) {
				result = req.responseText;
			}
			return {code: req.status, data: result};
		};

		var XHR = XMLHttpRequest;
		var request = new XHR();

		request.open(opts.method, that.url+opts.url, true);

		request.onreadystatechange = function () {
			if (request.readyState === 4 && cb) {
				var obj = parse(request);
				if (request.status >= 200 && request.status < 300) {
					cb(obj);
				} else {
					cb(null, obj.error || obj);
				}
			}
		};
		request.send();
	},

	render_notfound: function() {
		document.title = 'Fancy Dashboard';
		d3.select('body').style('background-color', null);
		this.app.innerHTML = Templates.notfound();
	},

	render_empty: function() {
		document.title = 'Fancy Dashboard';
		d3.select('body').style('background-color', null);
		this.app.innerHTML = Templates.empty();
	},

	render_dash: function() {
		var app = d3.select('#app');
		var dash = app.select('#dash');

		// there's already a dash there
		if ( ! dash.empty()) {
			this.style_dash(dash);
		} else { // need to create the initial dash
			app.html('');
			this.style_dash(app.append('div'));
		}

		// make background colour what they want it to be
		d3.select('body').style('background-color', this.active.config.colour);
	},

	style_dash: function(node) {
		var size = this.active.size;
		var width = size[0] * 200;
		var height = size[1] * 200;

		node
			.attr('id', 'dash')
			.attr('data-token', this.active.token)
			.style('width', width + 'px')
			.style('height', height + 'px')
			.style('margin-left', -width/2 + 'px')
			.style('margin-top', -height/2 + 'px');
	},

	render_widget: function(widget) {
		this.id('dash').appendChild(this.make_node(Templates.widget(widget)));
	},

	format: function(n) {
		if (n === 0) return 0;

		if ((n < 0.01 && n > 0) || (n > -0.01 && n < 0)) {
			 var parts = n.toExponential().split('e');
			 parts[0] = Number(parts[0]).toPrecision(3);
			 return parts[0] + 'e' + parts[1];
		}

		if (n >= 0.01 && n < 1) return Number(n.toPrecision(2));

		var prefixes = ["", "k", "M", "G", "T", "P", "E", "Z", "Y" ];

		var i = 1 + Math.floor(1e-12 + Math.log((n < 0 ? -n : n))/Math.LN10);
		i = Math.max(-24, Math.min(24, Math.floor((i-1)/3)*3));
		i /= 3;

		var k = Math.pow(10, i*3);
		n /= k;

		// convert to number to get rid of padded 0s eg 1.000
		return Number(n.toPrecision(4)) + prefixes[i];
	},

	timeago: function(time) {
		var
		local = new Date().getTime(),
		offset = Math.abs((local - time)),
		span = [],
		t = this.times;

		if (offset <= t.SECOND)              span = [ '', 'now' ];
		else if (offset < (t.SECOND * 60))   span = [ Math.round(Math.abs(offset / t.SECOND)), 'second'];
		else if (offset < (t.MINUTE * 60))   span = [ Math.round(Math.abs(offset / t.MINUTE)), 'min' ];
		else if (offset < (t.HOUR * 24))     span = [ Math.round(Math.abs(offset / t.HOUR)), 'hr' ];
		else if (offset < (t.DAY * 7))       span = [ Math.round(Math.abs(offset / t.DAY)), 'day' ];
		else if (offset < (t.DAY * 31))      span = [ Math.round(Math.abs(offset / t.DAY)), 'day' ];
		else if (offset < (t.DAY * 366))      span = [ Math.round(Math.abs(offset / t.DAY/30)), 'month' ];
		else                               span = [ '', 'a long time' ];


		span[1] += (span[0] === 0 || span[0] > 1) ? 's' : '';
		span = span.join(' ');

		if (span === ' now') return 'now';

		return (time <= local)  ? span + ' ago' : 'in ' + span;
	}
};

import "widgets/";

domready(function() {
	Dash.init();
});
