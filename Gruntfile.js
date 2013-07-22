module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: {
        src: ['Gruntfile.js', 'index.js', 'example/**/*.js', 'models/**/*.js', 'public/**/*.js', 'routes/**/*.js', 'tests/**/*.js']
      },
      ci: {
        options: {
          force: true,
          reporter: 'checkstyle',
          reporterOutput: 'jshint-result.xml'
        },
        src: '<%= jshint.all.src %>'
      }
    },
    mochacov: {
      all: {
        options: {
          reporter: 'spec',
          require: ['should'],
        },
        src: ['test/**/*.js'],
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-cov');

  // Tasks
  grunt.registerTask('test', ['mochacov']);
  // Default task.
  grunt.registerTask('default', ['jshint', 'test']);

};
