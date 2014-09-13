var request = require('request');
var argv = require('minimist')(process.argv.slice(2));

var DASH_ID = '53f07667614e501ee3000002';
var SOURCE_IDS = ['pnikre', 'tscpht'];

function time(offset) {
	var times = {
		'second': 1000,
		'minute': 1000*60,
		'hour': 1000*60*60,
		'day': 1000*60*60*24,
	}

	var date = new Date();
	var reduction = date.getTime();
	reduction -= offset * (argv.time || times[argv.period] || times.hour);
	date.setTime(reduction);

	return Math.floor(date.getTime() / 1000);
}

var handle = function(err, res, body) {
	if (err) {
		console.log("POOPED", err.message);
	}
	console.log(res.statusCode);
	if (body && body.error) console.log(body.error)
};

for (var i=0; i<(argv.points || 24); i++) {
	for (var j=0; j<SOURCE_IDS.length; j++) {
		var data = {
			metric: 'widget.data',
			timestamp: time(i),
			value: Math.random() * -100,
			tags: {
				dash: DASH_ID,
				ws: SOURCE_IDS[j]
			}
		};

		var options = {
			url: 'http://162.243.232.110:4242/api/put',
			method: 'POST',
			json: data,
			timeout: 100000
		};

		request(options, handle);
	}
}
