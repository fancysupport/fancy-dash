var Dash = {
	url: 'http://api.fancysupport.com:4000/public',
	active: null,
	widgets: {},
	app: null,

	init: function() {
		// cache
		this.app = this.id('app');

		Chart.defaults.global.showTooltips = false;
		Chart.defaults.global.rotateXLabels = false;

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

	empty: function(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	},

	generate_timeseries: function(data, points, period) {
		var end = {};
		var now = new Date().getTime();

		for (var i=0; i<points; i++) {
			end[now-i*period] = 0;
		}

		for (orig in data) {
			for (time in end) {
				if (orig*1000 >= time && Math.abs(orig*1000-time) < period) {
					end[time] = data[orig];
					break;
				}
			}
		}

		return this.entries(end);
	},

	generate_legend: function(parent, data) {
		parent.className = 'legend';
		var datas = data.hasOwnProperty('datasets') ? data.datasets : data;

		// remove possible children of the parent
		while(parent.hasChildNodes()) {
			parent.removeChild(parent.lastChild);
		}

		datas.forEach(function(d) {
			var title = document.createElement('span');
			title.className = 'title';
			title.style.borderColor = d.hasOwnProperty('strokeColor') ? d.strokeColor : d.color;
			title.style.borderStyle = 'solid';
			parent.appendChild(title);

			var text = document.createTextNode(d.label);
			title.appendChild(text);
		});
	},

	generate_line: function(widget) {
		this.generate_chart({
			widget: widget,
			type: 'Line',
			options: {
				scaleVerticalGridLines:false,
				skipXLabels: 6,
				bezierCurve: false,
				animation: widget.chart ? false : true
			},
			style: {
				label: 'todo labels',
				fillColor: "rgba(169,169,169,0.4)",
				strokeColor: "rgba(169,169,169,1)",
				pointColor: "rgba(169,169,169,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(169,169,169,1)"
			}
		});
	},

	generate_bar: function(widget) {
		this.generate_chart({
			widget: widget,
			type: 'Bar',
			options: {
				scaleVerticalGridLines:false,
				skipXLabels: 6,
				animation: widget.chart ? false : true
			},
			style: {
				label: 'todo label',
				fillColor: "rgba(169,169,169,0.4)",
				strokeColor: "rgba(169,169,169,1)",
				highlightFill: "rgba(169,169,169,0.75)",
				highlightStroke: "rgba(169,169,169,1)"
			}
		});
	},

	generate_chart: function(opts) {
		var that = this;

		var node = this.qs('[data-id='+opts.widget.name+']');
		var ctx = node.querySelector('canvas').getContext('2d');
		var legend = node.querySelector('.legend');

		var period = 60*60*1000;
		var points = 24+1;

		opts.widget.period = period * 0.1;

		this.get_widget_data(opts.widget.name, function(ok, err) {
			if (ok && ok.data) {
				if ( ! ok.data[0]) ok.data[0] = {dps:{}};

				var values = that.generate_timeseries(ok.data[0].dps, points, period);
				values.sort(function(a,b){return a.key-b.key;});

				// TODO make it handle multiple data sets
				opts.style.data = values.map(function(e) { return e.value; });

				var data = {
					labels: values.map(function(e, i) {
						return that.timeago(parseInt(e.key, 10)/1000);
					}),

					datasets: [opts.style]
				};

				that.generate_legend(legend, data);

				if (opts.widget.chart) opts.widget.chart.destroy();

				opts.widget.chart = new Chart(ctx)[opts.type](data, opts.options);
			}
		});
	},

	get_dash: function(token) {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/dashboards/' + token
		}, function(ok, err) {
			console.log(ok, err);

			if (ok)	{
				that.active = ok.data;
				that.init_dash();
			}

			if (err && err.code === 404)
				that.render_notfound();
		});
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
		this.widgets[w.name] = w;

		this.render_widget(w);

		var node = this.qs('[data-id='+w.name+']');

		if (['line','bar'].indexOf(w.type) === -1) return;

		this['generate_'+w.type](w);

		w.interval = setInterval(function() {
			that['generate_'+w.type](w);
			console.log('new '+w.type+' for', w.name);
		}, w.period);
	},

	get_widget_data: function(name, cb) {
		this.ajax({
			method: 'GET',
			url: '/dashboards/' + this.active.token + '/data/' + name
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
		// unsure how to just append a string to DOM
		// so take the DOM from an element and append that
		var w = document.createElement('div');
		w.innerHTML = Templates.widget(widget);
		this.id('dash').appendChild(w.firstChild);
	},

	timeago: function(time) {
		var
		local = new Date().getTime()/1000,
		offset = Math.abs((local - time)),
		span   = [],
		MINUTE = 60,
		HOUR   = 3600,
		DAY    = 86400,
		WEEK   = 604800,
		MONTH  = 2629744,
		YEAR   = 31556926;
		DECADE = 315569260;

		if (offset <= MINUTE)              span = [ '', 'now' ];
		else if (offset < (MINUTE * 60))   span = [ Math.round(Math.abs(offset / MINUTE)), 'min' ];
		else if (offset < (HOUR * 24))     span = [ Math.round(Math.abs(offset / HOUR)), 'hr' ];
		else if (offset < (DAY * 7))       span = [ Math.round(Math.abs(offset / DAY)), 'day' ];
		else if (offset < (WEEK * 52))     span = [ Math.round(Math.abs(offset / WEEK)), 'week' ];
		else if (offset < (YEAR * 10))     span = [ Math.round(Math.abs(offset / YEAR)), 'year' ];
		else if (offset < (DECADE * 100))  span = [ Math.round(Math.abs(offset / DECADE)), 'decade' ];
		else                               span = [ '', 'a long time' ];

		span[1] += (span[0] === 0 || span[0] > 1) ? 's' : '';
		span = span.join(' ');

		if (span === ' now') return span;

		return (time <= local)  ? span + ' ago' : 'in ' + span;
	}
};

domready(function() {
	Dash.init();
});
