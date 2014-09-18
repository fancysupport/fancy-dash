Dash.generate_text = function(widget) {
	var that = this;

	var colours = [
		'#FF9F29',
		'#FF742E',
		'#F55332'
	];

	var node = d3.select('[data-id="' + widget.id + '"]').append('div');
	var text = node.attr('class', 'text')
		.style('height', widget.size[1]*200-20-30 + 'px') // x*cell - w_margin - text_margin
		.style('width', widget.size[0]*200-20-30 + 'px')
		.node();

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data text', ok.data);
				var sources = [];
				for (var i=0; i<ok.data.length; i++) {
					for (var j=0; j<widget.sources.length; j++) {
						if (ok.data[i].id === widget.sources[j].id && widget.sources[j].source === 'internal') {
							var key = Object.keys(ok.data[i].data)[0];
							ok.data[i].data = ok.data[i].data[key];

							sources.push(ok.data[i]);
						}
					}
				}

				node.selectAll('p').remove();

				if (sources.length === 0) return;

				for (i=0; i<sources.length; i++) {
					text.appendChild(that.make_node(Templates.text({
						data: sources[i].data,
						colour: colours[i]
					})));
				}
			}
		});
	}

	draw();
	setInterval(draw, 60*1000);
};
