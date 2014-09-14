Dash.generate_legend = function(parent, data, type, size) {
	parent.select('.legend').remove();

	var l = parent.append('div').attr('class', 'legend cf '+type)
		.html(Templates['legend_'+type](data));

	console.log('l',l);

	if (type === 'col' && size.w < size.h)
		l.style('transform', 'translate(-50%, 0)');
};
