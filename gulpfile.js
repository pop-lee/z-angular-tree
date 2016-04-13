/**
 *  Welcome to your gulpfile!
 *  The gulp tasks are splitted in several files in the gulp directory
 *  because putting all here was really too long
 */

'use strict';

// 引入 gulp
var gulp = require('gulp');
var gutil = require('gulp-util');
var path = require('path');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

var config = {
    src : "src",
    dest : "dist",
    example: "example",
    errorHandler : function(title) {
        'use strict';
    
        return function(err) {
            gutil.log(gutil.colors.red('[' + title + ']'), err.toString());
            this.emit('end');
        };
    }
}

gulp.task('tpls', function () {
    return gulp.src([
            path.join(config.src, '/template/*.html'),
        ])
        .pipe($.minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe($.angularTemplatecache('z-angular-tpls.js', {
            module: 'z.angular.tree',
            root: 'zangular/template/'
        }))
        .pipe(gulp.dest(config.src));
});

gulp.task('styles', function () {
    var sassOptions = {
        style: 'expanded'
    };

    return gulp.src([
            path.join(config.src, '/z-angular-tree.scss')
        ])
        .pipe($.sourcemaps.init())
        .pipe($.sass(sassOptions)).on('error', config.errorHandler('Sass'))
        .pipe($.autoprefixer()).on('error', config.errorHandler('Autoprefixer'))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest(path.join(config.dest)))
        .pipe(browserSync.reload({ stream: true }));
});




var browserSync = require('browser-sync');
var browserSyncSpa = require('browser-sync-spa');
function browserSyncInit(baseDir, browser) {
    browser = browser === undefined ? 'default' : browser;

    var server = {
        baseDir: baseDir
    };

    browserSync.instance = browserSync.init({
        startPath: '/example/index.html',
        server: server,
        browser: browser,
        port:3000
    });
}

browserSync.use(browserSyncSpa({
    selector: '[ng-app]'// Only needed for angular apps
}));

gulp.task('watch', function () {

    gulp.watch([path.join(config.src, '/template/*.html')],function(event) {
       gulp.start('tpls');
    });

    gulp.watch([path.join(config.src, '/**/*.{html,js,scss}'),path.join(config.example, '/**/*')],function(event) {
        gulp.start('build');
        browserSync.reload(event.path);
    });

});


gulp.task('serve', ['watch','build'], function () {
    browserSyncInit('');
});


gulp.task('build',['tpls','styles'], function () {
    var jsFilter = $.filter(['**/*.js','!**/*-tpls.js'], { restore: true });

    var tplsFilter = $.filter(['**/*-tpls.js'], { restore: true });
    
    return gulp.src([
        path.join(config.src,'/!(*-tpls)*.js'),
        path.join(config.src,'/*-tpls.js')
    ])
        .pipe(concat('z-angular-tree.js'))
        .pipe(gulp.dest(config.dest))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())

        .pipe(gulp.dest(config.dest))
        ;
});

gulp.task('clean', function () {
    return $.del([path.join(config.dest, '/')]);
});

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});