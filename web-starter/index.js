'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash');

module.exports = generators.Base.extend({
  prompting : function() {
    var done = this.async();
    var config = _.extend({
      features : true,
      cmi : false,
      drupal_theme : ''
    }, this.config.getAll());

    this.prompt([{
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
    }], function (answers) {
      this.config.set(answers);
      
      // Expose the answers on the parent generator
      _.extend(this.options.parent.answers, { 'web-starter-drupal' : answers });
      
      // Set the platform
      this.options.parent.answers.platform = 'drupal';
      
      done();
    }.bind(this));
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
          linked_dirs : '%w[/vagrant/public/sites/default/files]'
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
      this.options.parent.answers.theme_gemfile = 'sites/all/themes/' + this.options.parent.answers['web-starter-drupal'].drupal_theme + '/Gemfile';
    }
  },
  writing : {
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
