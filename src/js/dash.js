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

	generate_timeseries: function(data, points, period) {
		var end = {};
		var now = new Date().getTime();

		var empty = [];
		for (var i=0; i<data.length; i++) {
			empty.push(0);
		}

		for (var i=0; i<points; i++) {
			end[now-i*period] = empty.slice(0);
		}

		for (var i=0; i<data.length; i++) {
			for (var orig in data[i]) {
				for (var time in end) {
					if (orig*1000 > time && Math.abs(orig*1000-time) < period) {
						end[time][i] = data[i][orig];
						break;
					}
				}
			}
		}

		end = this.entries(end);
		end.sort(function(a,b){return a.key-b.key;});

		return end;
	},

	generate_legend: function(parent, data) {
		parent.className = 'legend';
		var datas = data.hasOwnProperty('datasets') ? data.datasets : data;

		// remove possible children of the parent
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild);
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
		var that = this;
		var format = d3.format('.4s');

		this.get_widget_data(widget.id, function(ok, err) {
			if (ok && ok.data) {
				if (ok.data.length === 0) ok.data[0] = {dps:{}};
			}
		})
	},

	generate_bar: function(widget) {
		var that = this;
		var format = d3.format('.4s');

		var period = 60*60*1000;
		var points = 25;

		var margin = {top: 20, right: 30, bottom: 30, left: 40};
		var width = widget.size[0] * 200 - 20 - margin.left - margin.right;
		var height = widget.size[1] * 200 - 20 - margin.top - margin.bottom;

		var x = d3.scale.linear()
			.rangeRound([0, width])

		var y = d3.scale.linear()
			.range([height, 0])

		var xAxis = d3.svg.axis()
			.scale(x)
			.tickFormat(function(d) { return that.timeago(d/1000); })
			.orient('bottom')

		var yAxis = d3.svg.axis()
			.scale(y)
			.tickFormat(function(d) {
				var p = d3.formatPrefix(d);
				return p.scale(d) + p.symbol;
			})
			.orient('left');

		node = d3.select('[data-id=' + widget.name + ']')
		svg = node.append('svg')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
			.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		var tip = d3.tip()
			.attr('class', 'd3-tip')
			.html(function(d) {
				return that.timeago(d.key/1000) + ': ' + format(d.value);
				//return new Date(+d.key).toString() + ': ' + format(d.value);
			});
		svg.call(tip);

		this.get_widget_data(widget.id, function(ok, err) {
			if (ok && ok.data) {

				var sources = [];
				for (var i=0; i<ok.data.length; i++) {
					for (var j=0; j<widget.sources.length; j++) {
						if (ok.data[i].id === widget.sources[j].id && widget.sources[j].source === 'tsdb')
							sources.push(ok.data[i].data);
					}
				}

				var data = that.generate_timeseries(sources, points, period);
		/*		
				// remove previous stuff in prep for redraw
				node.selectAll('svg > g > *').remove();

				var data = that.generate_timeseries(ok.data[0].dps, points, period)

				// an extra period at either end for padding?
				x.domain([Date.now()-points*period, Date.now()+period])

				// make domain slightly larger than the actual data
				y.domain([0, d3.max(data, function(d) { return d.value*1.1; })])

				xAxis.tickValues(data.map(function(d) { return d.key; }))

				// x axis
				svg.append('g')
					.attr('class', 'x axis')
					.attr('transform', 'translate(0,' + height + ')')
					.call(xAxis)

				// remove most of the ticks
				// TODO change points/4 to more generic
				svg.selectAll('.x.axis > .tick')
					.each(function(d, i) {
						if (i % Math.floor(points/4) !== 0)
							this.remove();
					});

				// y axis
				svg.append('g')
					.attr('class', 'y axis')
					.call(yAxis)

				// y grid lines
				svg.append('g')
					.attr('class', 'grid')
					.call(yAxis.tickSize(-width, 0, 0).tickFormat(''))
					// TODO actually make sure this always removes the bottom one
					.select('g').remove()

				svg.selectAll('.bar')
					.data(data)
				.enter().append('rect')
					.attr('class', 'bar')
					.attr('x', function(d) { return x(d.key) - width/points*0.9/2; })
					.attr('width', width/points*0.9)
					.attr('y', function(d) { return y(d.value); })
					.attr('height', function(d) { return height - y(d.value); })
					.on('mouseover', tip.show)
					.on('mouseout', tip.hide);

				*/
			}
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
		this.widgets[w.id] = w;

		this.render_widget(w);

		var node = this.qs('[data-id='+w.name+']');

		if (['line','bar'].indexOf(w.type) === -1) return;

		this['generate_'+w.type](w);
		console.log(w)
		w.interval = setInterval(function() {
			that['generate_'+w.type](w);
			console.log('new '+w.type+' for', w.name);
		}, 6*60*1000); // TODO fix this when widgets are better structured
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

	get_widget_data: function(id, cb) {
		this.ajax({
			method: 'GET',
			url: '/dashboards/' + this.active.token + '/widgets/' + id + '/data'
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
