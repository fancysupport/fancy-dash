Dash.generate_status = function(widget) {
	var that = this;

	var width = widget.size[0] * 200 - 20;
	var height = widget.size[1] * 200 - 20;

	var scale = Math.min(widget.size[0], widget.size[1]);

	var off_y = 0;
	if(widget.size[1] > widget.size[0]) {
		off_y = height/4;
	}

	var node = d3.select('[data-id="' + widget.id + '"]');
	var svg = node.append('svg')
			.attr('width', width)
			.attr('height', height)
		.append('g')
			.attr('transform', 'translate(' + (width/2) + ',' + (off_y) + ') scale(' + scale + ')');

	var happy_smiley = "M100.515,100.512  c20.686-20.684,20.684-54.341,0.002-75.024C79.829,4.799,46.17,4.799,25.486,25.483C4.798,46.169,4.8,79.829,25.488,100.517  C46.17,121.201,79.829,121.201,100.515,100.512z M31.273,31.27c17.494-17.493,45.959-17.495,63.457,0.002  c17.494,17.494,17.492,45.962-0.002,63.455c-17.494,17.494-45.961,17.496-63.455,0.002C13.775,77.233,13.777,48.764,31.273,31.27z   M68.828,51.641c0-4.797,3.904-8.701,8.703-8.701c4.797,0,8.701,3.903,8.701,8.701c0,1.381-1.119,2.5-2.5,2.5s-2.5-1.119-2.5-2.5  c0-2.041-1.66-3.701-3.701-3.701c-2.042,0-3.703,1.66-3.703,3.701c0,1.381-1.119,2.5-2.5,2.5S68.828,53.021,68.828,51.641z   M41.105,51.614c0-4.797,3.904-8.701,8.703-8.701c4.797,0,8.701,3.903,8.701,8.701c0,1.381-1.119,2.5-2.5,2.5s-2.5-1.119-2.5-2.5  c0-2.041-1.66-3.701-3.701-3.701c-2.042,0-3.703,1.66-3.703,3.701c0,1.381-1.119,2.5-2.5,2.5S41.105,52.995,41.105,51.614z   M39.996,73.965c-0.636-1.53,0.089-3.286,1.62-3.921c0.376-0.156,0.766-0.23,1.15-0.23c1.176,0,2.292,0.696,2.771,1.85  c2.777,6.685,9.655,11.004,17.523,11.004c7.69,0,14.528-4.322,17.421-11.011c0.658-1.521,2.424-2.222,3.944-1.563  c1.521,0.658,2.22,2.423,1.563,3.944c-3.843,8.887-12.843,14.629-22.928,14.629C52.759,88.668,43.706,82.897,39.996,73.965z";
	var sad_smiley = "M100.515,100.512  c20.686-20.684,20.684-54.341,0.002-75.024C79.829,4.799,46.17,4.799,25.486,25.483C4.798,46.169,4.8,79.829,25.488,100.517  C46.17,121.201,79.829,121.201,100.515,100.512z M31.273,31.27c17.494-17.493,45.959-17.495,63.457,0.002  c17.494,17.494,17.492,45.962-0.002,63.455c-17.494,17.494-45.961,17.496-63.455,0.002C13.775,77.233,13.777,48.764,31.273,31.27z   M68.828,51.641c0-4.797,3.904-8.701,8.703-8.701c4.797,0,8.701,3.903,8.701,8.701c0,1.381-1.119,2.5-2.5,2.5s-2.5-1.119-2.5-2.5  c0-2.041-1.66-3.701-3.701-3.701c-2.042,0-3.703,1.66-3.703,3.701c0,1.381-1.119,2.5-2.5,2.5S68.828,53.021,68.828,51.641z   M41.105,51.614c0-4.797,3.904-8.701,8.703-8.701c4.797,0,8.701,3.903,8.701,8.701c0,1.381-1.119,2.5-2.5,2.5s-2.5-1.119-2.5-2.5  c0-2.041-1.66-3.701-3.701-3.701c-2.042,0-3.703,1.66-3.703,3.701c0,1.381-1.119,2.5-2.5,2.5S41.105,52.995,41.105,51.614z   M40.996,84.045c3.71-8.932,12.764-14.703,23.064-14.703c10.084,0,19.084,5.742,22.927,14.629c0.658,1.521-0.041,3.287-1.563,3.944  c-1.52,0.66-3.285-0.042-3.943-1.563c-2.894-6.689-9.731-11.011-17.421-11.011c-7.868,0-14.747,4.319-17.523,11.004  c-0.479,1.154-1.596,1.85-2.771,1.85c-0.384,0-0.773-0.074-1.15-0.23C41.085,87.331,40.36,85.575,40.996,84.045z";

	function check(s) {
		switch (s.toLowerCase()) {
			case '1': return true;
			default: return false;
		}
	}

	function draw() {
		that.get_widget_data(widget, function(ok, err) {
			if (ok && ok.data) {
				var value = ok.data.data[0].value;

				var source = {
					data: value,
					colour: widget.sources[0].config.colour,
					name: widget.sources[0].name,
				};

				node.selectAll('.status').remove();
				node.selectAll('.title').remove();

				var is_ping = !!widget.config.ping;
				var last_updated = ok.data.data[0].timestamp * 1000;

				var icon;
				var time = 5*60*1000; // 5 minutes
				if (is_ping) {
					// less than or equal to 5 minutes old
					if (Date.now() - last_updated <= time) {
						icon = check(source.data) ? happy_smiley : sad_smiley;
					}
					else icon = sad_smiley;
				}
				else icon = check(source.data) ? happy_smiley : sad_smiley;

				var smiley = svg.append('g')
					.attr('transform', 'translate(-62, 10)')
					.attr('class', 'status');

				smiley.append('path')
					.style('fill', source.colour)
					.attr('d', icon);

				var font_size = scale * 25;
				if (font_size > 35) font_size = 35;
				if (widget.size[0] === widget.size[1]) font_size /= 1.2;
				if (font_size < 25) font_size = 25;
				font_size *= scale;

				node.append('div')
					.style({
						'font-size': font_size+'px',
						'color': source.colour,
						'width': width+'px'
					})
					.attr('class', 'title')
					.text(source.name);
			}
		});
	}

	draw();
	this.intervals[widget.id] = this.intervals[widget.id] || [];
	this.intervals[widget.id][0] = setInterval(draw, 60*1000);
};
