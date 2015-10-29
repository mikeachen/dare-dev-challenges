var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var cached = require('gulp-cached');
var livereload = require('gulp-livereload');
var cssLinter = require('gulp-csslint');
var htmlLinter = require('gulp-html5-lint');
var notifier = require('node-notifier');
var child_process = require('child_process');
var Firebase = require('firebase');
var hostnameListRef = new Firebase('https://dazzling-heat-7283.firebaseio.com/hostnames');
var hostnameRef;

var HTML_PATH = 'challenges/**/*.html';
var CSS_PATH = 'challenges/**/*.css';

var SAVE_REMINDER_INTERVAL = 120; // in seconds.

var saveReminder;
function rescheduleSaveReminder() {
  clearTimeout(saveReminder);
  saveReminder = setTimeout(function() {
    notifier.notify({
      title: 'Please save!',
      message: 'You have not saved in ' + SAVE_REMINDER_INTERVAL + ' seconds.'
    });
    rescheduleSaveReminder();
  }, SAVE_REMINDER_INTERVAL * 1000);
}

gulp.task('html', function() {
  return gulp.src(HTML_PATH)
    .pipe(cached('html'))
    .pipe(htmlLinter());
});

gulp.task('css', function() {
  return gulp.src(CSS_PATH)
    .pipe(cached('css'))
    .pipe(cssLinter({
      // Only flag errors.
      'box-model': true,
      'display-property-grouping': true,
      'duplicate-properties': true,
      'empty-rules': true,
      'known-properties': true
    }))
    .pipe(cssLinter.reporter());
});

gulp.task('server', function(done) {
  nodemon({
    script: 'app.js'
  });
});

gulp.task('watch', function() {
  livereload.listen({ port: 19999 });

  function fileChanged(file) {
    rescheduleSaveReminder();
    livereload.changed(file.path);
  }
  gulp.watch([HTML_PATH], ['html']).on('change', fileChanged);
  gulp.watch([CSS_PATH], ['css']).on('change', fileChanged);

  rescheduleSaveReminder();
});

gulp.task('publish-hostname', function(done) {
  if (process.env.DARE_HOSTNAME) {
    hostnameRef = hostnameListRef.push(process.env.DARE_HOSTNAME, done);
  } else {
    child_process.exec('scutil --get LocalHostName', function(err, hostname) {
      if (err) {
        done(err);
        return;
      }

      hostname = hostname.trim() + '.local';

      hostnameRef = hostnameListRef.push(hostname, done);
    });
  }
});

process.on('SIGINT', function() {
  if (!hostnameRef) process.exit();

  hostnameRef.remove(function() {
    process.exit();
  });
});

gulp.task('default', ['css', 'html', 'server', 'watch', 'publish-hostname']);
