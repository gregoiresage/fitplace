module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {   
      dist: {
        src: [
          'js/libs/jquery.min.js',
          'js/libs/draggybits.js',
          'js/libs/keymaster.js',
          'js/custom/*.js'
        ],
        dest: 'build/make8bitart.js',
      },
      css : {
        src: [
          'css/libs/*.css',
          'css/custom/*.css',
        ],
        dest: 'build/make8bitart.css',
      }
    },
    uglify: {
      build: {
        src: 'build/make8bitart.js',
        dest: 'build/make8bitart.min.js'
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
    },
    watch: {
      scripts: {
        files: ['js/*/*.js'],
        tasks: ['concat:dist','uglify'],
        options: {
          spawn: false
        }
      },
      css: {
        files: ['css/*/*.css'],
        tasks: ['concat:css','cssmin'],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['concat','uglify','cssmin']);

};
