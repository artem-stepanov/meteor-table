Package.describe({
  name: 'akora:meteor-table',
  version: '0.0.1',
  summary: 'A rich reactive table',
  git: '',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  api.use('templating', 'client');
  api.use('jquery', 'client');
  api.use('underscore', 'client');
  api.use('reactive-var@1.0.3', 'client');
  //api.use("anti:i18n@0.4.3", 'client');
  api.use("mongo@1.0.8", ["server", "client"]);

  api.use("twbs:bootstrap@3.3.5", 'client');
  api.use("fortawesome:fontawesome@4.2.0", 'client', {weak: true});
  api.use("netanelgilad:excel", "server");
  api.use("netanelgilad:node-uuid", "server");
  api.use("netanelgilad:mkdirp", "server");
  api.use("vsivsi:file-collection", ["server", "client"]);
  api.use("tmeasday:publish-counts", ["server", "client"]);
  api.use("natestrauser:select2", "client");
  api.use("rajit:bootstrap3-datepicker", "client");
  api.use("momentjs:moment", ["server", "client"]);
  api.use("suxez:jquery-serialize-object", "client");

  api.addFiles('lib/MeteorTable.js',  ['client', 'server']);
  api.addFiles('lib/MeteorTable.css',  'client');
  api.addFiles('lib/MeteorTable.html',  'client');
  api.addFiles('lib/MeteorTableServer.js', 'server');

  api.export('MeteorTable', ['client', 'server']);
});

//Package.onTest(function(api) {
//  api.use('tinytest');
//  api.use('akora:meteor-table');
//  api.addFiles('meteor-table-tests.js');
//});
