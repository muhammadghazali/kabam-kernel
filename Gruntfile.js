/**
 * automatically add ngdoc directives
 */
var processContent = function(content, srcpath) {
  return '@ngdoc overview\n@name kabam-kernel\n@description\n\n' + content;
};

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: {
        src: ['Gruntfile.js', 'index.js', 'core/**/*.js', 'bin/**/*.js', 'test/**/*.js']
      },
      ci: {
        options: {
          force: true,
          reporter: 'checkstyle',
          reporterOutput: 'results/jshint-result.xml'
        },
        src: '<%= jshint.all.src %>'
      }
    },
    simplemocha: {
      options: {
        globals: ['should'],
        ignoreLeaks: false,
        ui: 'bdd',
        timeout: 4000
      },
      all: {
        options: {
          reporter: 'spec'
        },
        src: [ 'test/**/*.test.js' ]
      }
    },
    clean: {
      docs: [ 'results/docs' ]
    },
    copy: {
      options: {
        processContent: processContent
      },
      readme: {
        src: 'README.md',
        dest: 'results/index.ngdoc'
      }
    },
    ngdocs: {
      options: {
        dest: 'results/docs',
        title: 'KabamKernel',
        startPage: '/api'
      },
      api: {
        src: ['results/index.ngdoc', 'index.js', 'lib/**/*.js', 'core/**/*.js', ' bin/**/*.js'],
        title: 'Kernel API'
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
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-simple-mocha');
  grunt.loadNpmTasks('grunt-ngdocs');

  // Tasks
  grunt.registerTask('test', ['simplemocha']);
  grunt.registerTask('docs', ['clean:docs', 'copy:readme', 'ngdocs']);

  // Default task.
  grunt.registerTask('default', ['jshint', 'test', 'docs']);

};
