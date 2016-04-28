var _ = require('lodash');
var fs = require('fs');
var path = require('path');

function walk(dir, done) {
	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) return done(null, results);
		list.forEach(function(file) {
			file = path.resolve(dir, file);
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function(err, res) {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				} else {
					results.push(file);
					if (!--pending) done(null, results);
				}
			});
		});
	});
};

walk(path.join('model', 'backend-ui'), function(err, filePaths) {
	if (err) {
		throw err;
	}

	var generated = {};

	filePaths.forEach(function(filePath) {
		var file = require(filePath);
		generated = _.extend(generated, file);
	});

	fs.writeFileSync(path.join('backend-ui', 'generated', 'model.json'), JSON.stringify(generated));
});
