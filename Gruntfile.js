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
        dest: 'js/build/make8bitart.js',
      },
      css : {
        src: [
          'css/libs/*.css',
          'css/custom/*.css',
        ],
        dest: 'css/build/make8bitart.css',
      }
    },
    uglify: {
      build: {
        src: 'js/build/make8bitart.js',
        dest: 'js/build/make8bitart.min.js'
      }
    },
    cssmin: {
      minify: {
        expand: true,
        cwd: 'css/build',
        src: ['*.css', '!*.min.css'],
        dest: 'css/build',
        ext: '.min.css'
      },
  }  

});

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['concat','uglify','cssmin']);

};
