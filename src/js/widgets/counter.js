Dash.generate_counter = function(widget) {
	var that = this;
	var format = d3.format('.4s');

	var node = d3.select('[data-id="' + widget.id + '"]');
	var counter = node.append('div').attr('class', 'counter');

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				console.log('new data counter', ok.data);
				var sources = [];
				for (var i=0; i<ok.data.length; i++) {
					for (var j=0; j<widget.sources.length; j++) {
						if (ok.data[i].id === widget.sources[j].id && widget.sources[j].source === 'internal') {
							var key = Object.keys(ok.data[i].data)[0];
							ok.data[i].data = ok.data[i].data[key];
							ok.data[i].colour = widget.sources[j].config.colour;
							ok.data[i].name = widget.sources[j].name;

							sources.push(ok.data[i]);
						}
					}
				}

				if (sources.length === 0) return;

				counter.html(Templates.counter({
					amount: sources[0].data,
					colour: sources[0].colour,
					name: sources[0].name,
					size: widget.size
				}));
			}
		});
	}

	draw();
	setInterval(draw, 60*1000);
};
