Dash.generate_bar = function(widget) {
	var that = this;
	var format = this.format;

	var time = this.generate_times(widget.config.time);
	var period = time.period;
	var points = time.points;

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
			return format(d);
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

	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ')');

	svg.append('g')
		.attr('class', 'y axis');

	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.attr('data-id', widget.id);

	svg.call(tip);

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				ok.data.sort(function(a,b){
					return a.source_id > b.source_id;
				});

				var sources = [];

				for (var i=0; i<ok.data.length; i++) {
					for (var j=0; j<widget.sources.length; j++) {
						if (ok.data[i].source_id === widget.sources[j].id) {

							sources.push({
								data: ok.data.data[i].values,
								colour: widget.sources[j].config.colour,
								name: widget.sources[j].name
							});
						}
					}
				}

				if (sources.length === 0) return;

				var data = that.generate_layered_series(sources, points, period);
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

				var bar_width = width/points*0.8;

				// all the points will be removed due to the fact the x key updates
				rect.exit().remove();

				rect.enter().append('rect')
					.attr('x', function(d) { return x(d.x) - bar_width/2; })
					.attr('height', function(d) { return Math.abs(y(d.y0) - y(d.y0 + d.y)); })
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

				that.generate_legend(node, legend, 'row');
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id][0] = setInterval(draw, 60*1000);
};
