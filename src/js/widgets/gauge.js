Dash.generate_gauge = function(widget) {
	var that = this;
	var format = d3.format('.4s');

	var width = widget.size[0] * 200 - 20;
	var height = widget.size[1] * 200 - 20;

	var offset_x = width/2;// - (width > 200 && width >= height ? width/4 : 0);
	var offset_y = height/2;// - (height > width ? height/4 : 0);

	var node = d3.select('[data-id="' + widget.id + '"]');
	var svg = node.append('svg')
			.attr('width', width)
			.attr('height', height)
		.append('g')
			.attr('transform', 'translate(' + (offset_x) + ',' + (offset_y) + ')');

	var pie = d3.layout.pie()
		.value(function(d) { return d.data; });

	var radius = Math.min(width, height) / 3;
	//if (width === height && width > 200) radius /= 1.5;

	var arc = d3.svg.arc()
		.startAngle(0 * (Math.PI/180))
		.outerRadius(radius)
		.innerRadius(radius*0.8);

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data gauge', ok.data);

				var source = {
					data: parseFloat(ok.data[0].data[0].results[0].values[0][1]) || 0,
					colour: widget.sources[0].config.colour,
					name: ok.data[0].data[0].results[0].name
				};

				node.selectAll('.gauge').remove();

				var max_value = widget.config.max_value;
				var current_value = source.data;

				var font_size = radius / 3;

				var gauge = svg.append('g')
					.attr('class', 'gauge');

				gauge.append('path')
					.attr('class', 'background')
					.attr('d', arc.endAngle(360*(Math.PI/180)));

				gauge.append('path')
					.attr('class', 'foreground')
					.style('fill', source.colour)
					.attr('d', arc.endAngle(current_value / max_value * 360 * Math.PI/180));

				gauge.append('text')
					.attr('text-anchor', 'middle')
					.style('font-size', font_size+'px')
					.style('font-weight', 'bold')
					.style('fill', source.colour)
					.attr('dy', -font_size*0.4+'px')
					.text(format(current_value));

				gauge.append('text')
					.attr('class', 'max')
					.attr('text-anchor', 'middle')
					.style('font-size', font_size*0.75+'px')
					.attr('dy', font_size+'px')
					.text(format(max_value));
			}
		});
	}

	draw();
	setInterval(draw, 60*1000);
};
