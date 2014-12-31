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

				var size = widget.size;

				var big = 25 * size[0] * 2;
				var small = 12.5 * size[0] * 2;

				if (size[0] > size[1] || size[0] === size[1]) {
					big *= 0.7;
					small *= 0.7;
				}

				if (size[0] === 1 && size[1] === 1) {
					big *= 0.9;
					small *= 0.9;
				}

				if (big > size[1]*200/2) {
					big = size[1]*200 * 0.325;
					small = big * 0.6;
				}

				var update = function() {
					var data = difference(parseFloat(ok.data[0].values[0][1]) || 0);

					count.html(Templates.countdown({
						data: data,
						colour: widget.sources[0].config.colour,
						size: [big, small],
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
