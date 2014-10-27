Dash.generate_pie = function(widget) {
	var that = this;
	var format = this.format;

	var width = widget.size[0] * 200 - 20;
	var height = widget.size[1] * 200 - 20;

	var offset_x = width/2 - (width > 200 && width >= height ? width/4 : 0);
	var offset_y = height/2 - (height > width ? height/4 : 0);

	var node = d3.select('[data-id="' + widget.id + '"]');
	var svg = node.append('svg')
			.attr('width', width)
			.attr('height', height)
		.append('g')
			.attr('transform', 'translate(' + (offset_x) + ',' + (offset_y) + ')');

	var pie = d3.layout.pie()
		.value(function(d) { return d.data; });

	var radius = Math.min(width, height) / 3;
	if (width === height && width > 200) radius /= 1.5;

	var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(radius*0.6);

	var tip = d3.tip()
		.attr('class', 'd3-tip');

	svg.call(tip);

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data pie', ok.data);
				var sources = [];

				for (var i=0; i<ok.data.length; i++) {
					for (var j=0; j<widget.sources.length; j++) {
						if (ok.data[i].id === widget.sources[j].id) {
							sources.push({
								data: parseFloat(ok.data[i].data[0].results[0].values[0][1]) || 0,
								colour: widget.sources[j].config.colour,
								name: ok.data[i].data[0].results[0].name
							});
						}
					}
				}

				if (sources.length === 0) return;

				tip.html(function(d, e) {
					return '<span class="value">' + d.data.name + ': ' + format(d.value) + '<span class="key" style="background-color:' + sources[e].colour + ';"></span></span>';
				});

				if (sources.filter(function(d) { return d.data > 0; }).length > 0) {
					var a = svg.selectAll('.arc')
						.data(pie(sources))
					.enter().append('g')
						.attr('class', 'arc');

					a.append('path')
						.attr('d', arc)
						.style('fill', function(d, i) {
							return sources[i].colour;
						})
						.on('mouseover', function(d, e, i) {
							tip.show.call(this, d, e, i, d3.event);
						})
						.on('mouseout', tip.hide);
				}

				if (width > 200 || height > 200) {
					for (i=0; i<sources.length; i++) {
						sources[i].total = sources[i].data;
					}

					that.generate_legend(node, sources, 'col', {w:width, h:height});
				}
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id].push(setInterval(draw, 60*1000));
};
