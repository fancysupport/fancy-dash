Dash.generate_countdown = function(widget) {
	var that = this;
	var interval;

	var t = this.times;

	var node = d3.select('[data-id="' + widget.id + '"]');
	var count = node.append('div')
		.attr('class', 'countdown')
		.style('height', widget.size[1]*200-20-30 + 'px')
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
				console.log('new data countdown', ok.data);

				clearInterval(interval);

				var update = function() {
					// only do one source
					count.html(Templates.countdown({
						data: difference(parseFloat(ok.data[0].data[0].results[0].values[0][1]) || 0),
						colour: widget.sources[0].config.colour,
						size: widget.size
					}));
				};

				update();
				interval = setInterval(update, 1000);
			}
		});
	}

	draw();
	setInterval(draw, 60*1000);
};
