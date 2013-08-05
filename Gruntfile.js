module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: {
        src: ['Gruntfile.js', 'index.js', 'example/**/*.js', 'models/**/*.js', 'public/**/*.js', 'routes/**/*.js', 'test/**/*.js']
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
        ui: 'bdd'
      },
      all: {
        options: {
          reporter: 'spec'
        },
        src: [ 'test/**/*.js' ]
      }
    },
    copy: {
      readme: {
        src: 'README.md',
        dest: 'results/guide.ngdoc'
      }
    },
    ngdocs: {
      options: {
        dest: 'results/docs',
        title: 'mwc kernel',
        startPage: '/guide'
      },
      api: {
        src: ['index.js', 'lib/**/*.js', 'models/**/*.js'],
        title: 'MWC Kernel API'
      },
      guide: {
        src: ['results/guide.ngdoc'],
        title: 'Developer Guide'
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
  grunt.loadNpmTasks('grunt-simple-mocha');
  grunt.loadNpmTasks('grunt-ngdocs');

  // Tasks
  grunt.registerTask('test', ['simplemocha']);
  grunt.registerTask('docs', ['copy:readme', 'ngdocs']);

  // Default task.
  grunt.registerTask('default', ['jshint', 'test', 'docs']);

};
