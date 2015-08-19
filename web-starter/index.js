'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash');

module.exports = generators.Base.extend({
  engine : require('yeoman-hoganjs-engine'),
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
  writing : {
    aliases : function() {
      console.log('writing:aliases');
    },
    make : function() {
      console.log('writing:make');
    },
    settings : function() {
      var done = this.async();
      
      var config = this.config.getAll();
      this.template('public/sites/default/settings.vm.php', 'public/sites/default/settings.vm.php', config);
      
      done();
    }
  }
});
