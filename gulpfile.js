// Copyright 2019 Extreme Networks, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// 'use strict';

const gulp = require("gulp");
const mocha = require("gulp-mocha")
// import gulp from 'gulp';
// import mocha from 'gulp-mocha';
var settings = {
  "dev": ".",
  "lint": [
    "*.js",
	"src/**/*.js",
	"test/**/*.js"
  ]
}
// var plumber = require("gulp-plumber");
// var eslint = require("gulp-eslint");
// import mocha from 'gulp-mocha';
// import plumber from 'gulp-plumber';
// import eslint from 'gulp-eslint';

// gulp.task('lint', () => gulp.src(settings.lint, { cwd: settings.dev })
//   .pipe(plugins.plumber())
//   .pipe(plugins.eslint())
//   .pipe(plugins.eslint.format())
// );

// gulp.task('test', () => gulp.src('test/**/*.js', { read: false })
//     .pipe(plugins.mocha({ reporter: 'spec' }))
// );

// function lint(cb) {
//   src(settings.lint, {cwd: settings.dev})
//     .pipe(plumber())
//     .pipe(eslint())
//     .pipe(eslint.format())
//   cb()
// }

function test(cb) {
  gulp.src('test/**/*.js', {read: false})
    .pipe(mocha({reporter: 'spec'}))
  cb()
}

// gulp.task('default', gulp.series('lint', 'test'));

// exports.lint = lint
exports.default = test
// exports.default = series(lint, test)