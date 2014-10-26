Dash.generate_fancy_customers_impressions = function(widget) {
	var graph_type = widget.config.graph_type;

	if (graph_type === 'line') return this.generate_line(widget);
	if (graph_type === 'bar') return this.generate_bar(widget);
};
