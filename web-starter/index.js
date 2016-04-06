'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  semver = require('semver'),
  glob = Promise.promisify(require('glob'));

module.exports = generators.Base.extend({
  prompting : function() {
    var done = this.async();
    var that = this;
    
    var config = _.extend({
      features : true,
      cmi : false,
      drupal_theme : '',
      drupal_version : ''
    }, this.config.getAll());

    
    rp({ 
      url : 'https://api.github.com/repos/drupal/drupal/tags?per_page=100',
      headers : {
        'User-Agent' : 'generator-web-starter-drupal',
      }
    }).then(function(response) {
      var tags = _.chain(JSON.parse(response))
        .map(function(tag) {
          var name = tag.name;
          var release = '';
          
          if (!semver.valid(name)) {
            name = name + '.0';
          }

          // Prior to version 8 there were no minor version only patch versions
          if (semver.valid(name)) {
            if (7 >= parseInt(semver.major(name))) {
              release = semver.major(name) + '.0';
            }
            else {
              release = semver.major(name) + '.' + semver.minor(name);
            }
          }
          
          tag.release = release;
          return tag;
        })
        .filter(function(tag) {
          return !_.isEmpty(tag.release);
        })
        .groupBy('release')
        .map(function(release) {
          return release.shift();
        })
        .orderBy('name', 'desc')
        .map(function(tag) {
          return tag.name;
        })
        .value();

      // If we have an existing version ensure it's available in the list
      if (!_.isEmpty(config.wp_version) && !_.find(tags, config.drupal_version)) {
        tags.push(config.drupal_version);
        _.reverse(tags.sort());
      }
      else if (_.isEmpty(config.drupal_version)) {
        config.drupal_version = tags[0];
      }
      
      return new Promise(function(resolve, reject) {
        that.prompt([{
          type : 'list',
          name : 'drupal_version',
          choices : tags,
          message : 'Select a version of Drupal',
          default : config.drupal_version,
        },
        {
          type: 'confirm',
          name: 'features',
          message: 'Does it use the Features module?',
          default: config.features,
        },
        {
          type: 'confirm',
          name: 'cmi',
          message: 'Does it use the Configuration module?',
          default: config.cmi,
        },
        {
          type: 'input',
          name: 'drupal_theme',
          message: 'Theme name',
          default: config.drupal_theme,
        },
        {
          type: 'confirm',
          name: 'install_drupal',
          message: 'Install a fresh copy of Drupal?',
          default: false,
        }], function (answers) {
          resolve(answers);
        })
      });
    }).then(function(answers) {
      that.config.set(answers);

      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-drupal' : answers });
      
      // Set the platform
      that.options.parent.answers.platform = 'drupal';
    }).finally(function() {
      done();
    });
  },
  configuring : {
    addCapistrano : function() {
      var config = this.config.getAll();
      
      // If we're using Capistrano set some additional values
      if (_.has(this.options.parent.answers, 'web-starter-capistrano')) {
        _.extend(this.options.parent.answers['web-starter-capistrano'].config, {
          drupal_features : config.features,
          drupal_cmi : config.cmi,
          drupal_db_updates : 'true',
          linked_dirs : '%w[public/sites/default/files]'
        });
      }
    },
    addSolr : function() {
      // Set local variable for Solr if the user has selected to use Puppet
      if (_.has(this.options.parent.answers, 'web-starter-puppet')) {
        this.options.parent.answers['web-starter-drupal'].solr = this.options.parent.answers['web-starter-puppet'].solr
      }
    },
    setThemePath : function() {
      this.options.parent.answers.theme_path = 'public/sites/all/themes/' + this.options.parent.answers['web-starter-drupal'].drupal_theme;
    }
  },
  writing : {
    drupal : function() {
      var that = this;
      var done = this.async();
      var config = this.config.getAll();

      if (config.install_drupal) {
        // Create a Promise for remote downloading
        var remote = new Promise(function(resolve, reject) {
          that.remote('drupal', 'drupal', config.drupal_version, function(err, remote) {
            if (err) {
              reject(err);
            }
            else {
              resolve(remote);
            }
          });
        });
        
        // Begin Promise chain
        remote.bind(this).then(function(remote) {
          this.remote = remote;
          return glob('**', { cwd : remote.cachePath });
        }).then(function(files) {
          var remote = this.remote;
          
          _.each(files, function(file) {
            that.fs.copy(
              remote.cachePath + '/' + file,
              that.destinationPath('public/' + file)
            );
          });
        }).finally(function() {
          // Declare we're done
          done();
        });
      }
      else {
        done();
      }
    },
    aliases : function() {
      console.log('writing:aliases');
    },
    make : function() {
      console.log('writing:make');
    },
    settings : function() {
      var done = this.async();
      
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-drupal'];
      _.extend(config, this.options.parent.answers);
      
      this.fs.copyTpl(
        this.templatePath('public/sites/default/settings.vm.php'),
        this.destinationPath('public/sites/default/settings.vm.php'),
        config
      );
      
      done();
    }
  }
});
