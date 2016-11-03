'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  glob = Promise.promisify(require('glob')),
  pkg = require('../package.json'),
  ygp = require('yeoman-generator-bluebird'),
  drupal_modules = require('drupal-modules');

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
      this.options.addDevDependency(pkg.name, '~' + pkg.version);
    },
    platform : function() {
      // Set the platform
      this.options.parent.answers.platform = 'drupal';
    }
  },
  prompting : function() {
    var that = this;

    var config = _.extend({
      features : true,
      cmi : false,
      drupal_theme : '',
      drupal_version : '',
      drush_version : '7.4.0'
    }, this.config.getAll());

    return drupal_modules.getLatestMinorVersions('drupal').then(function(releases) {
      var tags = [ _.chain(releases)
        .filter({ version_major : 7 })
        .map(function(release) {
          return release.version;
        })
        .head()
        .value() ];

      if (config.drupal_version && tags[0] != config.drupal_version) {
        tags.push(config.drupal_version);
      }

      return Promise.resolve(tags);
    })
    .then(function(tags) {
      return that.prompt([{
        type : 'list',
        name : 'drupal_version',
        choices : tags,
        message : 'Select a version of Drupal',
        default : config.drupal_version,
      },
      {
        type    : 'list',
        name    : 'drush_version',
        message : 'Drush version',
        default : config.drush_version,
        choices : [ '9.0.0-alpha1', '8.1.7', '7.4.0', '6.7.0' ]
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
        message: 'Theme name (machine name)',
        default: config.drupal_theme,
      },
      {
        type: 'confirm',
        name: 'install_drupal',
        message: 'Install a fresh copy of Drupal?',
        default: false,
      }]);
    })
    .then(function(answers) {
      that.config.set(answers);

      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-drupal' : answers });
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
      this.options.parent.answers['web-starter-drupal'].solr = (_.has(this.options.parent.answers, 'web-starter-puppet')) ? this.options.parent.answers['web-starter-puppet'].solr : false;
    },
    setThemePath : function() {
      this.options.parent.answers.theme_path = 'public/sites/all/themes/' + this.options.parent.answers['web-starter-drupal'].drupal_theme;
      this.options.parent.answers.build_path = 'public/sites/all/themes/' + this.options.parent.answers['web-starter-drupal'].drupal_theme;
    }
  },
  writing : {
    drupal : function() {
      var that = this;
      var config = this.config.getAll();

      if (config.install_drupal) {
        // Create a Promise for remote downloading
        return this.remoteAsync('drupal', 'drupal', config.drupal_version)
        .bind({})
        .then(function(remote) {
          this.remotePath = remote.cachePath;
          return glob('**', { cwd : remote.cachePath });
        })
        .then(function(files) {
          var remotePath = this.remotePath;
          _.each(files, function(file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath('public/' + file)
            );
          });
        });
      }
    },
    aliases : function() {
      console.log('writing:aliases');
    },
    make : function() {
      console.log('writing:make');
    },
    settings : function() {
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-drupal'];
      _.extend(config, this.options.parent.answers);
      
      this.fs.copyTpl(
        this.templatePath('public/sites/default/settings.vm.php'),
        this.destinationPath('public/sites/default/settings.vm.php'),
        config
      );
    }
  }
});
