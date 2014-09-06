var Dash = {
	url: 'http://api.fancysupport.com:4000/public',
	active: null,
	app: null,

	init: function() {
		// cache
		this.app = this.id('app');

		this.hash_changed();

		// set up the hash change callback
		window.onhashchange = this.hash_changed.bind(this);
	},

	hash_changed: function() {
		var token = window.location.hash.slice(1);
		console.log('new hash:', token);

		if (token) this.get_dash(token);
		else this.render_empty();
	},

	id: function(q) {
		return document.getElementById(q);
	},

	qs: function(q) {
		return document.querySelector(q);
	},

	empty: function(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	},

	get_dash: function(token) {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/dashboards/' + token
		}, function(ok, err) {
			console.log(ok, err);

			if (ok)	{
				that.active = ok.data;
				that.render_dash();
			}

			if (err && err.code === 404)
				that.render_notfound();
		});
	},

	render_notfound: function() {
		this.app.innerHTML = Templates.notfound();
	},

	render_empty: function() {
		this.app.innerHTML = Templates.empty();
	},

	render_dash: function() {
		this.app.innerHTML = Templates.dash(this.active);

		for (var i=0; i<this.active.widgets.length; i++) {
			this.render_widget(this.active.widgets[i]);
		}
	},

	render_widget: function(widget) {
		var w = document.createElement('div');
		w.innerHTML = Templates.widget(widget);
		this.id('dash').appendChild(w.firstChild);
	},

	ajax: function (opts, cb) {
		var that = this;

		var parse = function (req) {
			var result;
			try {
				result = JSON.parse(req.responseText);
			} catch (e) {
				result = req.responseText;
			}
			return {code: req.status, data: result};
		};

		var XHR = XMLHttpRequest || ActiveXObject;
		var request = new XHR('MSXML2.XMLHTTP.3.0');

		request.open(opts.method, that.url+opts.url, true);

		request.onreadystatechange = function () {
			if (request.readyState === 4 && cb) {
				var obj = parse(request);
				if (request.status >= 200 && request.status < 300) {
					cb(obj);
				} else {
					cb(null, obj.error || obj);
				}
			}
		};
		request.send();
	}
};

domready(function() {
	Dash.init();
});
