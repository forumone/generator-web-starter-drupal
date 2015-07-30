'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash');

module.exports = generators.Base.extend({
  engine : require('yeoman-hoganjs-engine'),
  prompting : {
    prompts : function() {
      var done = this.async();
      var config = _.extend({
        features : true,
        cmi : false,
        solr : true,
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
        type: 'confirm',
        name: 'solr',
        message: 'Does it use Solr?',
        default: config.solr,
      },
      {
        type: 'input',
        name: 'drupal_theme',
        message: 'Theme name',
        default: config.drupal_theme,
      }], function (answers) {
        this.config.set(answers);
        done();
      }.bind(this));
    },
  },
  writing : {
    aliases : function() {
      console.log('writing:aliases');
    },
    make : function() {
      console.log('writing:make');
    }
  }
});
