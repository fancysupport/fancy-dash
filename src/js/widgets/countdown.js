Dash.generate_countdown = function(widget) {
	var that = this;
	var interval;

	var colours = [
		'#FF9F29',
		'#FF742E',
		'#F55332'
	];

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

				clearInterval(interval);

				if (sources.length === 0) return;

				var update = function() {
					// just going to make it the first source
					// if they want multiple, make multiple
					count.html(Templates.countdown({
						data: difference(sources[0].data),
						colour: colours[0],
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
