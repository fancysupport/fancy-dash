Dash.generate_counter = function(widget) {
	var that = this;

	var node = d3.select('[data-id="' + widget.id + '"]');
	var counter = node.append('div').attr('class', 'counter');

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				var data = '--';
				try {
					data = parseFloat(ok.data[0].values[0][1]) || 0;
				} catch (e) {}

				var source = {
					data: data,
					colour: widget.sources[0].config.colour,
					name: widget.sources[0].name,
				};

				var display = Dash.format(source.data);
				if (widget.sources[0].source === 'fancy:messages:avg_response_time') {
					var num = source.data, unit;

					if (num/60 < 1) {
						num = source.data;
						unit = 's';
					} else if (num/(60*60) < 1) {
						num = source.data/60;
						unit = 'm';
					} else if (num/(60*60*24) < 1) {
						num = source.data/(60*60);
						unit = 'h';
					} else {
						num = source.data/(60*60*24);
						unit = 'd';
					}

					if (source.data === '--') display = source.data;
					else display = Number(num.toFixed(1)) + unit;
				}

				var scale = Math.min(widget.size[0], widget.size[1]);
				var font_size =  scale * 25;
				if (font_size > 35) font_size = 35;
				if (widget.size[0] === widget.size[1]) font_size /= 1.2;
				if (font_size < 25) font_size = 25;
				font_size *= scale;

				counter.html(Templates.counter({
					amount: display,
					colour: source.colour,
					name: source.name,
					size: [font_size*2.25, font_size]
				}));
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id][0] = setInterval(draw, 60*1000);
};
