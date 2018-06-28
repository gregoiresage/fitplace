module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: ['Gruntfile.js', 'service-worker.js', 'js/app/*'],
      options: {
        reporterOutput: ''
      }
    },

    concat: {
      dist: {
        src: [
          'js/libs/jquery-3.2.1.min.js',
          'js/libs/draggybits.js',
          'js/libs/keymaster.js',
        ],
        dest: 'build/vendor.js',
      },
      app: {
        src: [
          'js/app/make8bitart.js',
        ],
        dest: 'build/make8bitart.js',
      },
      css : {
        src: [
          'css/libs/*.css',
          'css/app/*.css',
        ],
        dest: 'build/make8bitart.css',
      }
    },

    uglify: {
      build: {
        src: [
          'build/vendor.js',
          'build/make8bitart.js'
        ],
        dest: 'build/app.min.js'
      }
    },

    cssmin: {
      minify: {
        expand: true,
        cwd: 'build',
        src: ['*.css', '!*.min.css'],
        dest: 'build',
        ext: '.min.css'
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['concat','uglify','cssmin','jshint']);

};
