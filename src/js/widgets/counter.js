Dash.generate_counter = function(widget) {
	var that = this;
	var format = d3.format('.4s');

	var node = d3.select('[data-id="' + widget.id + '"]');
	var counter = node.append('div').attr('class', 'counter');

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data counter', ok.data);

				// only do one source
				counter.html(Templates.counter({
					amount: parseFloat(ok.data[0].data[0].results[0].values[0][1]) || 0,
					colour: widget.sources[0].config.colour,
					name: ok.data[0].data[0].results[0].name,
					size: widget.size
				}));
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id].push(setInterval(draw, 60*1000));
};
