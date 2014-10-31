Dash.generate_legend = function(parent, data, type, size) {
	parent.select('.legend').remove();

	var l = parent.append('div').attr('class', 'legend '+type)
		.html(Templates['legend_'+type](data));

	if (type === 'col' && size.w < size.h) {
		l.style('left', '50%');
		l.style('top', '65%');
	}
};
