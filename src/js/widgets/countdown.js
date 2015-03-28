Dash.generate_countdown = function(widget) {
	var that = this;
	var t = this.times;

	var node = d3.select('[data-id="' + widget.id + '"]');
	var count = node.append('div')
		.attr('class', 'countdown')
		.style('width', widget.size[0]*200-20-30 + 'px');

	function difference(then) {
		var now = Math.floor(new Date().getTime()/1000);
		var diff = then - now;

		var parts = [];

		if (diff <= 0) return [];

		var times = ['YEAR', 'DAY', 'HOUR', 'MINUTE', 'SECOND'];
		for (var i=0; i<times.length; i++) {
			var time = times[i];
			var value = Math.floor(t[time]/1000);

			var amount = Math.floor(diff / value);
			diff = diff % value;

			if (amount > 0) {
				parts.push({
					period: time.toLowerCase() + (amount > 1 ? 's' : ''),
					amount: amount
				});
			}
		}

		if (parts.length > 1) return [parts[0], parts[1]];
		return [{amount:'', period:''}, parts[0]];
	}

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				if (that.intervals[widget.id].length === 2)
					clearInterval(that.intervals[widget.id][1]);

				var value = ok.data.data[0].value;
				value = parseFloat(value) || 0;

				var size = widget.size;

				var scale = Math.min(widget.size[0], widget.size[1]);
				var font_size =  scale * 25;
				if (font_size > 35) font_size = 35;
				if (widget.size[0] === widget.size[1]) font_size /= 1.2;
				if (font_size < 25) font_size = 25;
				font_size *= scale;

				var big = 1.5;
				var small = 0.8;

				var update = function() {
					var data = difference(value);

					count.html(Templates.countdown({
						data: data,
						colour: widget.sources[0].config.colour,
						size: [font_size*big, font_size*small, font_size],
						name: widget.sources[0].name
					}));

					if (data.length === 0) clearInterval(that.intervals[widget.id][1]);
				};

				update();
				that.intervals[widget.id][1] = setInterval(update, 1000);
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id][0] = setInterval(draw, 60*1000);
};
