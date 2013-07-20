module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: ['Gruntfile.js', 'index.js', 'example/**/*.js', 'models/**/*.js', 'public/**/*.js', 'routes/**/*.js', 'test/**/*.js']
    },
    vows: {
      all: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-vows');

  // Tasks
  grunt.registerTask('test', ['vows:all']);
  // Default task.
  grunt.registerTask('default', ['jshint', 'test']);

};
