var gulp = require('gulp');
var util = require('gulp-util');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var stylus = require('gulp-stylus');
var concat = require('gulp-concat');
var livereload = require('gulp-livereload');
var header = require('gulp-header');
var dot = require('gulp-dot-precompiler');

var exec = require('child_process').exec;

var notifier = require('node-notifier');
var express = require('express');
var sstatic = require('serve-static');
var favicon = require('serve-favicon');

gulp.task('http', function() {
	var app = express();
	app.use(favicon(__dirname + '/dist/favicon.ico'));
	app.use(sstatic(__dirname + '/dist/assets'));
	app.route('*').get(function(req, res, next) {
		res.sendFile(__dirname + '/dist/index.html');
	});
	app.listen(3002);

	util.log('HTTP listening on', util.colors.yellow('3002'));
});

var handle_error = function(e) {
	util.log(util.colors.red(e.message));
	if (e.fileName) util.log(util.colors.red(e.fileName));

	var n = new notifier();
	n.notify({title: 'Build Error', message: e.message});
};

gulp.task('dot', function() {
	var d = dot({dictionary: 'Templates'})
		.on('error', function(e) {
			handle_error(e);
			d.end();
			return false;
		});

	return gulp.src('src/views/**/*')
		.pipe(d)
		.pipe(concat('templates.js'))
		.pipe(header('Templates = {};\n'))
		.pipe(gulp.dest('src/js'));
});

gulp.task('smash', ['dot'], function(cb) {
	exec('smash src/js/dash.js > build/dash.js', function(err) {
		if (err) handle_error(err);
		cb();
	});
});

gulp.task('js', ['smash'], function() {
	return gulp.src('build/dash.js')
		.pipe(concat('dash.js'))
		.pipe(gulp.dest('dist/assets'));
});

gulp.task('min_js', ['js'], function() {
	var u = uglify()
		.on('error', function(e) {
			handle_error(e);
			u.end();
			return false;
		});

	return gulp.src('dist/assets/dash.js')
		.pipe(u)
		.pipe(concat('dash.min.js'))
		.pipe(gulp.dest('dist/assets'));
});

gulp.task('stylus', function() {
	var s = stylus({errors: true, compress: false, 'include css': true})
		.on('error', function(e) {
			handle_error(e);
			s.end();
			return false;
		});

	return gulp.src('src/css/base.styl')
		.pipe(s)
		.pipe(gulp.dest('dist/assets/css'));
});

gulp.task('min_css', ['stylus'], function() {
	return gulp.src('dist/assets/css/base.css')
		.pipe(cssmin())
		.pipe(concat('base.min.css'))
		.pipe(gulp.dest('dist/assets/css'));
});

gulp.task('minify', ['min_js', 'min_css']);

gulp.task('watch', function() {
	livereload.listen();

	gulp.watch('src/js/**/*.js', ['min_js']).on('change', function(f) {
		livereload().changed(f.path);
	});

	gulp.watch('src/css/**/*', ['stylus']);
	gulp.watch('src/views/**/*', ['dot']);

	gulp.watch('dist/assets/css/*').on('change', function(f) {
		livereload().changed(f.path);
	});
});

gulp.task('default', ['http', 'minify', 'watch']);
