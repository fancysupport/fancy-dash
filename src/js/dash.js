import "domready";
import "templates";

var Dash = {
	url: 'http://api.fancysupport.com:4000/public',
	active: null,
	widgets: {},
	app: null,

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

		Chart.defaults.global.showTooltips = false;
		Chart.defaults.global.rotateXLabels = false;

		// TODO fix dot compiler to remove this needing to be on the prototype
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
		var token = window.location.hash.slice(1);
		console.log('new hash:', token);

		if (token) this.get_dash(token);
		else this.render_empty();
	},

	entries: function(map) {
		var e = [];
		for (var key in map) e.push({
			key: key,
			value: map[key]
		});
		return e;
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
			minute: {points: 61, period: 1000},
			hour: {points: 61, period: 1000*60},
			day: {points:25, period: 1000*60*60},
			week: {points:9, period: 1000*60*60*24},
			month: {points:31, period: 1000*60*60*24}
		};

		return times[interval];
	},

	generate_timeseries: function(data, points, period) {
		var end = {};
		var now = new Date().getTime();

		for (var i=0; i<points; i++) {
			end[now-i*period] = 0;
		}

		for (var orig in data) {
			for (var time in end) {
				if (Math.abs(orig*1000-time) < period) {
					end[time] = data[orig];
					break;
				}
			}
		}

		end = this.entries(end);
		end.sort(function(a,b){return a.key-b.key;});

		return end;
	},

	generate_layered_series: function(sources, points, period) {
		var that = this;
		var stack = [];

		var cb = function(e) {
			return {x: e.key, y: e.value, timeago: that.timeago(+e.key)};
		};

		for (var i=0; i<sources.length; i++) {
			stack[i] = {
				id: sources[i].id,
				name: sources[i].name,
				colour: sources[i].colour,
				values: this.generate_timeseries(sources[i].data, points, period).map(cb)};
		}

		stack.sort(function(a,b){return a.id>b.id;});

		return stack;
	},

	init_dash: function() {
		this.render_dash();

		var d = this.active;

		for (var i=0; i<d.widgets.length; i++) {
			this.init_widget(d.widgets[i]);
		}
	},

	init_widget: function(w) {
		var that = this;

		// assign to list to keep track easier
		this.widgets[w.id] = w;

		this.render_widget(w);

		this['generate_'+w.type](w);
		console.log('widget', w);
	},

	get_dash: function(token) {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/dashboards/' + token
		}, function(ok, err) {
			console.log('dash', ok, err);

			if (ok)	{
				that.active = ok.data;
				that.init_dash();
			}

			if (err && err.code === 404)
				that.render_notfound();
		});
	},

	get_widget_data: function(w, cb) {
		this.ajax({
			method: 'GET',
			url: '/dashboards/' + this.active.token + '/widgets/' + w.id + '/data?t=' + w.config.time + '&a=' + w.config.agg
		}, cb);
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

		var XHR = XMLHttpRequest || ActiveXObject;
		var request = new XHR('MSXML2.XMLHTTP.3.0');

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
		this.app.innerHTML = Templates.notfound();
	},

	render_empty: function() {
		this.app.innerHTML = Templates.empty();
	},

	render_dash: function() {
		this.app.innerHTML = Templates.dash(this.active);
	},

	render_widget: function(widget) {
		this.id('dash').appendChild(this.make_node(Templates.widget(widget)));
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
