Dash.generate_image = function(widget) {
	var that = this;

	var colours = [
		'#FF9F29',
		'#FF742E',
		'#F55332'
	];

	var node = d3.select('[data-id="' + widget.id + '"]');
	var image = node.append('div')
		.attr('class', 'image')
		.style('height', widget.size[1]*200-20-30 + 'px')
		.style('width', widget.size[0]*200-20-30 + 'px')
		.node();

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data image', ok.data);

				node.selectAll('img').remove();

				var url = '';

				try {
					url = ok.data[0].data[0].results[0].values[0][1];
				} catch(e) {}

				image.appendChild(that.make_node(Templates.image({
					data: url
				})));
			}
		});
	}

	draw();
	setInterval(draw, 60*1000);
};
