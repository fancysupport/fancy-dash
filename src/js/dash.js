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

	generate_times: function(interval) {
		var times = {
			minute: {points: 61, period: 1000},
			hour: {points: 61, period: 1000*60},
			day: {points:25, period: 1000*60*60},
			month: {points:31, period: 1000*60*60*24}
		}

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
		for (var i=0; i<sources.length; i++) {
			stack[i] = {
				id: sources[i].id,
				name: sources[i].name,
				values: this.generate_timeseries(sources[i].data, points, period).map(function(e) {
					return {x: e.key, y: e.value, timeago: that.timeago(+e.key)};
				})
			}
		}
		stack.sort(function(a,b){return a.id>b.id})
		return stack;
	},

	generate_legend: function(parent, data) {
		parent.select('.legend').remove();

		parent.append('div').attr('class', 'legend cf')
			.html(Templates.legend_totals(data));
	},

	generate_line: function(widget) {
		var that = this;
		var format = d3.format('.4s');

		var time = this.generate_times(widget.config.time);
		var period = time.period;
		var points = time.points;
		var colours = [
			'#FF9F29',
			'#FF742E',
			'#F55332'
		];

		var margin = {top: 30, right: 10, bottom: 35, left: 43};
		var width = widget.size[0] * 200 - 20 - margin.left - margin.right;
		var height = widget.size[1] * 200 - 20 - margin.top - margin.bottom;

		var x = d3.scale.linear()
			.range([0, width]);

		var y = d3.scale.linear()
			.range([height, 0]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.tickSize(0, 0, 0)
			.tickPadding(12)
			.tickFormat(function(d) { return that.timeago(d); })
			.orient('bottom');

		var yAxis = d3.svg.axis()
			.scale(y)
			.ticks(5)
			.orient('left')
			.tickSize(-width, -width, 0)
			.tickPadding(8)
			.tickFormat(function(d) {
				var p = d3.formatPrefix(d);
				return p.scale(d) + p.symbol;
			});

		var node = d3.select('[data-id="' + widget.id + '"]')
		var svg = node.append('svg')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
			.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		var stack = d3.layout.stack().values(function(d) {
			return d.values;
		});

		var line = d3.svg.line()
			.interpolate('linear')
			.x(function(d) { return x(d.x); })
			.y(function(d) { return y(d.y); });

		svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + height + ')');

		svg.append('g')
			.attr('class', 'y axis')

		var tip = d3.tip()
			.attr('class', 'd3-tip');

		svg.call(tip);

		function draw() {
			that.get_widget_data(widget, function(ok, err) {
				if (ok && ok.data) {
					console.log('new data line', ok.data);
					var sources = [];
					for (var i=0; i<ok.data.length; i++) {
						for (var j=0; j<widget.sources.length; j++) {
							if (ok.data[i].id === widget.sources[j].id && widget.sources[j].source === 'tsdb') {
								ok.data[i].name = widget.sources[j].name;
								if ( ! ok.data[i].data) ok.data[i].data = {};
								sources.push(ok.data[i]);
							}
						}
					}

					if (sources.length === 0) return;

					var data = that.generate_layered_series(sources, points, period);
					for (var i=0; i<data.length; i++) {
						data[i].colour = colours[i];
					}
					var layeredData = stack(data);

					// an extra period at either end for padding?
					x.domain([Date.now()-points*period, Date.now()+period]);

					var min = d3.min(layeredData, function(layer) {
						return d3.min(layer.values, function(d) {
							return d.y;
						}) * 1.1;
					});

					var max = d3.max(layeredData, function(layer) {
						return d3.max(layer.values, function(d) {
							return d.y;
						}) * 1.1;
					});

					if (min > 0) min = 0;
					if (max < 0) max = 0;
					if (min === 0 && max === 0) max = 1;

					y.domain([min, max]);

					xAxis.tickValues(data[0].values.map(function(d) { return d.x; }));
					svg.select('.x.axis').call(xAxis);
					svg.select('.y.axis').call(yAxis);

					// remove most of the ticks
					svg.selectAll('.x.axis > .tick')
						.each(function(d, i) {
							var p = points-1;
							if (width < 200) {
								if (i !== 0 && i !== p-1)
									this.remove();
								return;
							}

							if (i !== 0 && i !== p && i !== Math.round(p/2) && i !== Math.round(p/4) && i !== Math.round(3*p/4))
								this.remove();
						});

					tip.html(function(d, e) {
						var s = d.timeago;
						for (var i=0; i<layeredData.length; i++) {
							s += '<br/>' + '<span class="value">' + format(layeredData[i].values[e].y);
							s += '<span class="key" style="background-color:' + layeredData[i].colour + ';">';
							s += '</span></span>';
						}
						return s;
					});

					svg.selectAll('.layer').remove(); // clear out the old
					var layers = svg.selectAll('.layer')
						.data(layeredData)
					.enter().append('g')
						.attr('class', 'layer');

					layers.selectAll('path').remove();
					layers.append('path')
						.attr('class', 'line')
						.attr('d', function(d) { return line(d.values); })
						.style("stroke", function(d, i) { return layeredData[i].colour; });

					var circle = layers.selectAll('circle').data(function(d) {
						return d.values;
					});

					circle.enter().append('circle')
						.attr('class', 'circle')
						.attr('cx', function(d) { return x(d.x); })
						.attr('cy', function(d) { return y(d.y); })
						.attr('r', 5)
						.style('fill', function(d, e, i) { return layeredData[i].colour; })
						.on('mouseover', tip.show)
						.on('mouseout', tip.hide);

					var legend = {};
					legend.total = d3.sum(layeredData, function(layer, i) {
						var t = d3.sum(layer.values, function(d) {
							return d.y;
						});
						layer.total = t;
						return t;
					});
					legend.layers = layeredData;

					that.generate_legend(node, legend);
				}
			});
		}

		draw();
		setInterval(draw, 60*1000);
	},

	generate_bar: function(widget) {
		var that = this;
		var format = d3.format('.4s');

		var time = this.generate_times(widget.config.time);
		var period = time.period;
		var points = time.points;
		var colours = [
			'#FF9F29',
			'#FF742E',
			'#F55332'
		];

		var margin = {top: 30, right: 10, bottom: 35, left: 43};
		var width = widget.size[0] * 200 - 20 - margin.left - margin.right;
		var height = widget.size[1] * 200 - 20 - margin.top - margin.bottom;

		var x = d3.scale.linear()
			.range([0, width]);

		var y = d3.scale.linear()
			.range([height, 0]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.tickSize(0, 0, 0)
			.tickPadding(12)
			.tickFormat(function(d) { return that.timeago(d); })
			.orient('bottom');

		var yAxis = d3.svg.axis()
			.scale(y)
			.ticks(5)
			.orient('left')
			.tickSize(-width, -width, 0)
			.tickPadding(8)
			.tickFormat(function(d) {
				var p = d3.formatPrefix(d);
				return p.scale(d) + p.symbol;
			});

		var node = d3.select('[data-id="' + widget.id + '"]')
		var svg = node.append('svg')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
			.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		var stack = d3.layout.stack().values(function(d) {
			return d.values;
		});

		svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + height + ')');

		svg.append('g')
			.attr('class', 'y axis')

		var tip = d3.tip()
			.attr('class', 'd3-tip');

		svg.call(tip);

		function draw() {
			that.get_widget_data(widget, function(ok, err) {
				if (ok && ok.data) {
					console.log('new data bar', ok.data);
					var sources = [];
					for (var i=0; i<ok.data.length; i++) {
						for (var j=0; j<widget.sources.length; j++) {
							if (ok.data[i].id === widget.sources[j].id && widget.sources[j].source === 'tsdb') {
								ok.data[i].name = widget.sources[j].name;
								if ( ! ok.data[i].data) ok.data[i].data = {};
								sources.push(ok.data[i]);
							}
						}
					}

					if (sources.length === 0) return;

					var data = that.generate_layered_series(sources, points, period);
					for (var i=0; i<data.length; i++) {
						data[i].colour = colours[i];
					}
					var layeredData = stack(data);

					// an extra period at either end for padding?
					x.domain([Date.now()-points*period, Date.now()+period]);

					var min = d3.min(layeredData, function(layer) {
						return d3.min(layer.values, function(d) {
							return d.y0 + d.y;
						}) * 1.1;
					});

					var max = d3.max(layeredData, function(layer) {
						return d3.max(layer.values, function(d) {
							return d.y0 + d.y;
						}) * 1.1;
					});

					if (min > 0) min = 0;
					if (max < 0) max = 0;
					if (min === 0 && max === 0) max = 1;

					y.domain([min, max]);

					xAxis.tickValues(data[0].values.map(function(d) { return d.x; }));
					svg.select('.x.axis').call(xAxis);
					svg.select('.y.axis').call(yAxis);

					// remove most of the ticks
					svg.selectAll('.x.axis > .tick')
						.each(function(d, i) {
							var p = points-1;
							if (width < 200) {
								if (i !== 0 && i !== p-1)
									this.remove();
								return;
							}

							if (i !== 0 && i !== p && i !== Math.round(p/2) && i !== Math.round(p/4) && i !== Math.round(3*p/4))
								this.remove();
						});

					tip.html(function(d, e) {
						var s = d.timeago;
						for (var i=0; i<layeredData.length; i++) {
							s += '<br/>' + '<span class="value">' + format(layeredData[i].values[e].y);
							s += '<span class="key" style="background-color:' + layeredData[i].colour + ';">';
							s += '</span></span>';
						}
						return s;
					});

					var layers = svg.selectAll('.layer')
						.data(layeredData);

					layers.exit().remove();

					layers.enter().append('g')
						.attr('class', 'layer')
						.attr('height', height)
						.attr('style', function(d, i) { return 'fill:'+layeredData[i].colour+';'; });

					var rect = layers.selectAll('rect').data(function(d) {
						return d.values;
					}, function(d) {
						return d.x;
					});

					var bar_width = width/points*0.9;

					// all the points will be removed due to the fact the x key updates
					rect.exit().remove();

					rect.enter().append('rect')
						.attr('x', function(d) { return x(d.x) - bar_width/2 })
						.attr('height', function(d) { return Math.abs(y(d.y0) - y(d.y0 + d.y)) })
						.attr('width', bar_width)
						.attr('y', function(d) { return y(Math.max(d.y0, (d.y0 + d.y))); })
						.on('mouseover', tip.show)
						.on('mouseout', tip.hide);

					// remove all the bars that have no data
					rect.filter(function(d) {
						return d.y === 0;
					}).remove();

					var legend = {};
					legend.total = d3.sum(layeredData, function(layer, i) {
						var t = d3.sum(layer.values, function(d) {
							return d.y;
						});
						layer.total = t;
						return t;
					});
					legend.layers = layeredData;

					that.generate_legend(node, legend);
				}
			});
		}

		draw();
		setInterval(draw, 60*1000);
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

		if (['line','bar'].indexOf(w.type) === -1) return;

		this['generate_'+w.type](w);
		console.log('widget', w)
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
		// unsure how to just append a string to DOM
		// so take the DOM from an element and append that
		var w = document.createElement('div');
		w.innerHTML = Templates.widget(widget);
		this.id('dash').appendChild(w.firstChild);
	},

	timeago: function(time, specific) {
		var
		local = new Date().getTime(),
		offset = Math.abs((local - time)),
		span   = [],
		SECOND = 1000
		MINUTE = 60000,
		HOUR   = 3600000,
		DAY    = 86400000,
		WEEK   = 604800000;

		if (offset <= SECOND)              span = [ '', 'now' ];
		else if (offset < (SECOND * 60))   span = [ Math.round(Math.abs(offset / SECOND)), 'second'];
		else if (offset < (MINUTE * 60))   span = [ Math.round(Math.abs(offset / MINUTE)), 'min' ];
		else if (offset < (HOUR * 24))     span = [ Math.round(Math.abs(offset / HOUR)), 'hr' ];
		else if (offset < (DAY * 7))       span = [ Math.round(Math.abs(offset / DAY)), 'day' ];
		else if (offset < (DAY * 31))      span = [ Math.round(Math.abs(offset / DAY)), 'day' ];
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
