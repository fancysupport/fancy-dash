Dash.generate_counter = function(widget) {
	var that = this;

	var node = d3.select('[data-id="' + widget.id + '"]');
	var counter = node.append('div').attr('class', 'counter');

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				var big = 25 * widget.size[0] * 2;
				var small = 12.5 * widget.size[0] * 2;

				if (widget.size[0] > widget.size[1]) {
					big *= 0.8;
					small *= 0.8;
				}

				if (big > widget.size[1]*200/2) {
					big = widget.size[1]*200 * 0.4;
					small = big * 0.6;
				}

				counter.html(Templates.counter({
					amount: parseFloat(ok.data[0].values[0][1]) || 0,
					colour: widget.sources[0].config.colour,
					name: widget.sources[0].name,
					size: [big, small]
				}));
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id].push(setInterval(draw, 60*1000));
};
