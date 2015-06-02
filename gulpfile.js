/*
 Licensed to the StackStorm, Inc ('StackStorm') under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  plumber = require('gulp-plumber'),
  mocha = require('gulp-mocha');

gulp.task('lint', function() {
  return gulp.src(['scripts/**/*.js', 'lib/**/*.js', 'specs/**/*.js'])
    .pipe(plumber())
    .pipe(jshint('jshint.json'))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('tests', function() {
  return gulp.src('tests/**/*.js', {
      read: false
    })
    .pipe(mocha({
      reporter: 'spec'
    }));
});

gulp.task('ci', ['lint', 'tests']);

gulp.task('default', ['lint', 'tests']);
