Dash.generate_image = function(widget) {
	var that = this;

	var node = d3.select('[data-id="' + widget.id + '"]');
	var image = node.append('div')
		.attr('class', 'image')
		.style('height', widget.size[1]*200-20-30 + 'px')
		.style('width', widget.size[0]*200-20-30 + 'px')
		.node();

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				node.selectAll('img').remove();

				var value = ok.data.data[0].value;

				image.appendChild(that.make_node(Templates.image({
					data: value
				})));
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id][0] = setInterval(draw, 60*1000);
};
