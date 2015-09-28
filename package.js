Package.describe({
  name: 'akora:meteor-table',
  version: '0.0.13',
  summary: 'A rich reactive table for Meteor',
  git: 'https://github.com/artem-stepanov/meteor-table.git',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  api.use('templating', 'client');
  api.use('jquery', 'client');
  api.use('underscore', 'client');
  api.use('spacebars', 'client');
  api.use('reactive-var@1.0.3', 'client');
  api.use("anti:i18n@0.4.3", 'client');
  api.use("mongo@1.0.8", ["server", "client"]);

  api.use("twbs:bootstrap@3.3.5", 'client');
  api.use("fortawesome:fontawesome@4.2.0", 'client', {weak: true});
  api.use("netanelgilad:excel@0.2.4", "server");
  api.use("netanelgilad:node-uuid@1.0.2", "server");
  api.use("netanelgilad:mkdirp@0.0.1", "server");
  api.use("vsivsi:file-collection@1.2.0", ["server", "client"]);
  api.use("tmeasday:publish-counts@0.7.1", ["server", "client"]);
  api.use("natestrauser:select2@4.0.0", "client");
  api.use("rajit:bootstrap3-datepicker@1.4.1", "client");
  api.use("momentjs:moment@2.10.6", ["server", "client"]);
  api.use("suxez:jquery-serialize-object@1.0.0", "client");

  api.addFiles(['lib/MeteorTable.html', 'lib/MeteorTable.css'],  'client');
  api.addFiles('lib/MeteorTable.js',  ['client', 'server']);
  api.addFiles('lib/MeteorTableClient.js', 'client');
  api.addFiles('lib/MeteorTableServer.js', 'server');

  api.export('MeteorTable', ['client', 'server']);
  api.export('MeteorTableField', ['client', 'server']);
  api.export('MeteorTableParams', ['client', 'server']);
});

//Package.onTest(function(api) {
//  api.use('tinytest');
//  api.use('akora:meteor-table');
//  api.addFiles('meteor-table-tests.js');
//});
