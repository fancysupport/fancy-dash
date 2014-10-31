Dash.generate_text = function(widget) {
	var that = this;

	var node = d3.select('[data-id="' + widget.id + '"]').append('div');
	var text = node.attr('class', 'text')
		.style('height', widget.size[1]*200-20-30 + 'px') // x*cell - w_margin - text_margin
		.style('width', widget.size[0]*200-20-30 + 'px')
		.node();

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data text', ok.data);

				var source = {
					data: ok.data[0].values[0][1],
					colour: widget.sources[0].config.colour,
					font_size: parseFloat(widget.config.font_size) || 16,
				};

				node.selectAll('span').remove();

				var t = text.appendChild(that.make_node(Templates.text({
					data: source.data,
					colour: source.colour,
					font_size: source.font_size
				})));
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id].push(setInterval(draw, 60*1000));
};
