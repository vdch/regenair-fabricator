'use strict';

const pkg = require('./package.json');
const gulp = require('gulp');
const del = require('del');
const ghPages = require('gulp-gh-pages');
const postcss = require('gulp-postcss');
const sass = require('gulp-sass');
const stylelint = require('gulp-stylelint');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');

const processors = [
  require('autoprefixer'),
  require('cssnano')
];

const paths = {
  build: __dirname + '/www',
  dest: __dirname + '/tmp',
  src: __dirname + '/src'
};

/*
 * Configure a Fractal instance.
 */

const fractal = require('./fractal.js');
const logger = fractal.cli.console; // keep a reference to the fractal CLI console utility

/*
 * Start the Fractal server
 *
 * In this example we are passing the option 'sync: true' which means that it will
 * use BrowserSync to watch for changes to the filesystem and refresh the browser automatically.
 * Obviously this is completely optional!
 *
 * This task will also log any errors to the console.
 */
function serve() {
  const server = fractal.web.server({
    sync: true
  });

  server.on('error', err => logger.error(err.message));

  return server.start().then(() => {
    logger.success(`Fractal server is now running at ${server.url}`);
  });
};

/*
 * Run a static export of the project web UI.
 *
 * This task will report on progress using the 'progress' event emitted by the
 * builder instance, and log any errors to the terminal.
 *
 * The build destination will be the directory specified in the 'builder.dest'
 * configuration option set above.
 */
function build() {
    const builder = fractal.web.builder();

    builder.on('progress', (completed, total) => logger.update(`Exported ${completed} of ${total} items`, 'info'));
    builder.on('error', err => logger.error(err.message));
    return builder.build().then(() => {
        logger.success('Fractal build completed!');
    });
};

/**
 * Clean
 */
 function clean() {
   return del(paths.dest + '/assets/');
 };

/**
 * Deploy
 */
function deploy() {
  // Push contents of build folder to `gh-pages` branch
  return gulp.src(paths.build + '/**/*')
    .pipe(ghPages({
      force: true
    }));
    done();
}

/**
 * Styles
 */
function styles() {
  return gulp.src(paths.src + '/assets/styles/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.dest + '/assets/styles'));
}

/**
 * Style linting
 */
function lintstyles() {
  return gulp.src(paths.src + '/**/*.scss')
    .pipe(stylelint({
      reporters: [{
        formatter: 'string',
        console: true
      }]
    }));
};

/**
 * Style vendors
 */
function stylesVendors() {
 return gulp.src('node_modules/font-awesome/css/font-awesome.min.css')
   .pipe(sourcemaps.init())
   .pipe(postcss(processors))
   .pipe(rename('vendors.css'))
   .pipe(sourcemaps.write('./'))
   .pipe(gulp.dest(paths.dest + '/assets/styles/'));
}

/**
 * Fonts
 */
function fonts() {
  return gulp.src([
    paths.src + '/assets/fonts/**/*',
    "node_modules/font-awesome/fonts/**/*"
  ])
    .pipe(gulp.dest(paths.dest + '/assets/fonts/'));
}

/**
 * Scripts Vendors
 */
function scriptsVendors() {
  return gulp.src([
    "node_modules/bootstrap/dist/js/bootstrap.min.js"
  ])
    .pipe(sourcemaps.init())
    .pipe(rename('vendors.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.dest + '/assets/scripts/'));
}

/**
 * Watch
 */
function watch(done) {
  serve();
  gulp.watch(paths.src + '/**/*.css', styles);
};

/**
 * Task set
 */
const compile = gulp.series(clean, gulp.parallel(styles, stylesVendors, fonts, scriptsVendors));

gulp.task('lint', gulp.series(lintstyles));
gulp.task('build', gulp.series(compile, build));
gulp.task('dev', gulp.series(compile, watch));
gulp.task('publish', gulp.series(build, deploy));
