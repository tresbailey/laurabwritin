/**
 *   Gulp with TailwindCSS - An CSS Utility framework build setup with SCSS
 *   Author : Manjunath G
 *   URL : manjumjn.com | lazymozek.com
 *   Twitter : twitter.com/manju_mjn
 **/

import gulp from 'gulp';
const { src, dest, watch, series, parallel } = gulp;
import options from './config.js';
import browserSync from 'browser-sync';
browserSync.create();
import clean from 'gulp-clean';
import concat from 'gulp-concat';
import cssnano from 'cssnano';
import uglify from 'gulp-terser';
import fileInclude from 'gulp-file-include';
import imagemin from 'gulp-imagemin';
//import mozjpeg from 'imagemin-mozjpeg';
import pngquant from 'imagemin-pngquant';
import postcss from 'gulp-postcss';
import includePartials from 'gulp-file-include';
import tailwindcss from 'tailwindcss';
//import tailwindPostcss from '@tailwindcss/postcss';
import Datepicker from 'flowbite-datepicker/Datepicker';
import autoprefixer from 'autoprefixer';
import { deleteAsync } from 'del';

//Load Previews on Browser on dev
function livePreview(done) {
  browserSync.init({
    server: {
      baseDir: 'dist'
    },
    port: 5000,
  });
  done();
}

// Triggers Browser reload
function previewReload(done) {
  console.log("\n\t", "Reloading Browser Preview.\n");
  browserSync.reload();
  done();
}

//Development Tasks
function devHTML() {
  return src(`${options.paths.src.base}/**/*.html`, {base: 'src/pages'})
    .pipe(fileInclude({
      prefix: '@@',
      basepath: 'src/partials',
    }))
    .pipe(dest(options.paths.dist.base));
}

function devStyles() {
  return src(`${options.paths.src.base}/**/*.css`)
    .pipe(postcss([tailwindcss(options.config.tailwindjs), autoprefixer()]))
    .pipe(concat({ path: "style.css" }))
    .pipe(dest(options.paths.dist.css));
}

function copyFlowbite() {
  return src([
    'node_modules/flowbite/dist/flowbite.min.js',
    'node_modules/flowbite-datepicker/dist/js/datepicker.min.js'
  ])
  .pipe(dest('dist/assets/vendor'));
}


function devScripts() {
  return src([
    `${options.paths.src.js}/libs/**/*.js`,
    `${options.paths.src.js}/**/*.js`,
    `!./src/js/lib/**`,
    `!./src/third-party/**`,
  ])
    //.pipe(concat({ path: "scripts.js" }))
    .pipe(dest(options.paths.dist.js));
}

function devImages() {
    console.log("Dev Images output")
    console.log(`${options.paths.src.img}/**/*`)
  return src(`${options.paths.src.img}/**/*.{png,jpg,svg,gif,webp,ico}`, { encoding: false })
        .pipe(dest(options.paths.dist.img)
  );
}

function devFonts() {
  return src(`${options.paths.src.fonts}/**/*`).pipe(
    dest(options.paths.dist.fonts)
  );
}

function devThirdParty() {
  return src(`${options.paths.src.thirdParty}/**/*`).pipe(
    dest(options.paths.dist.thirdParty)
  );
}

function watchFiles() {
  watch(
    `${options.paths.src.base}/**/*.{html,php}`,
    series(devHTML, devStyles, previewReload)
  );
  watch(
    [options.config.tailwindjs, `${options.paths.src.css}/**/*.css`],
    series(devStyles, previewReload)
  );
  watch(`${options.paths.src.js}/**/*.js`, series(devScripts, previewReload));
  watch(`${options.paths.src.img}/**/*`, series(devImages, previewReload));
  watch(`${options.paths.src.fonts}/**/*`, series(devFonts, previewReload));
  watch(
    `${options.paths.src.thirdParty}/**/*`,
    series(devThirdParty, previewReload)
  );
  console.log("\n\t" , "Watching for Changes..\n");
}

function devClean() {
    return deleteAsync(['dist/**']);
    /*
  console.log(
    "\n\t",
    "Cleaning dist folder for fresh start.\n"
  );
  return src(options.paths.dist.base, { read: false, allowEmpty: true }).pipe(
    clean()
  );
  */
}

//Production Tasks (Optimized Build for Live/Production Sites)
function prodHTML() {
    console.log('running prod html');

  return src(`${options.paths.src.base}/**/*.html`, {base: 'src/pages'})
    .pipe(fileInclude({
      prefix: '@@',
      basepath:  'src/partials',
    }))
    .pipe(dest(options.paths.build.base));
}

function prodStyles() {
  return src(`${options.paths.src.base}/**/*.css`)
    .pipe(postcss([tailwindcss(options.config.tailwindjs), autoprefixer()]))
    .pipe(concat({ path: "style.css" }))
    .pipe(dest(options.paths.build.css));
}

function prodScripts() {
  return src([
    `${options.paths.src.js}/libs/**/*.js`,
    `${options.paths.src.js}/**/*.js`,
  ])
    //.pipe(concat({ path: "scripts.js" }))
    //.pipe(uglify())
    .pipe(dest(options.paths.build.js));
}

function prodImages() {
  const pngQuality = Array.isArray(options.config.imagemin.png)
    ? options.config.imagemin.png
    : [0.7, 0.7];
  const jpgQuality = Number.isInteger(options.config.imagemin.jpeg)
    ? options.config.imagemin.jpeg
    : 70;
  const plugins = [
    pngquant({ quality: pngQuality }),
    // mozjpeg({ quality: jpgQuality }),
  ];

  //return src(options.paths.src.img + "/**/*")
    //.pipe(imagemin([...plugins]))
    //.pipe(dest(options.paths.build.img));
  return src(`${options.paths.src.img}/**/*.{png,jpg,svg,gif,webp,ico}`, { encoding: false })
        .pipe(dest(options.paths.build.img)
  );
}

function prodFonts() {
  return src(`${options.paths.src.fonts}/**/*`).pipe(
    dest(options.paths.build.fonts)
  );
}

function prodThirdParty() {
  return src(`${options.paths.src.thirdParty}/**/*`).pipe(
    dest(options.paths.build.thirdParty)
  );
}

function prodClean() {
  console.log(
    "\n\t",
    "Cleaning build folder for fresh start.\n"
  );
  return src(options.paths.build.base, { read: false, allowEmpty: true }).pipe(
    clean()
  );
}

function buildFinish(done) {
  console.log(
    "\n\t",
    `Production build is complete. Files are located at ${options.paths.build.base}\n`
  );
  done();
}

export const prod = series(
    prodStyles,
    copyFlowbite,
    prodScripts,
    prodImages,
    prodFonts,
    prodThirdParty,
  prodHTML,
  function doneCheck(done) {
    console.log("✅ prod finished");
    done();
    }
);

export default series(
  //devClean, // Clean Dist Folder
  parallel(devStyles, copyFlowbite, devScripts, devImages, devFonts, devThirdParty, devHTML), //Run All tasks in parallel
  livePreview, // Live Preview Build
  watchFiles // Watch for Live Changes
);

