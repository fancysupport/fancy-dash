Dash.generate_line = function(widget) {
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

	var node = d3.select('[data-id="' + widget.id + '"]');
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
		.attr('class', 'y axis');

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
						if (ok.data[i].id === widget.sources[j].id) {
							ok.data[i].name = widget.sources[j].name;
							if ( ! ok.data[i].data) ok.data[i].data = {};
							sources.push(ok.data[i]);
						}
					}
				}

				if (sources.length === 0) return;

				var data = that.generate_layered_series(sources, points, period);
				for (i=0; i<data.length; i++) {
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
							d3.select(this).remove();
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

				that.generate_legend(node, legend, 'row');
			}
		});
	}

	draw();
	setInterval(draw, 60*1000);
};
