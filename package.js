Package.describe({
    name: 'akora:meteor-table',
    version: '0.2.38',
    summary: 'A rich reactive table for Meteor',
    git: 'https://github.com/artem-stepanov/meteor-table.git',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.1.0.3');

    api.use(['ecmascript@0.12.4'], ['client', 'server']);

    api.use('templating', 'client');
    api.use('check', ["server", "client"]);
    api.use('jquery', 'client');
    api.use('underscore', 'client');
    api.use('spacebars', 'client');
    api.use('reactive-var@1.0.3', 'client');
    api.use("anti:i18n@0.4.3", 'client');
    api.use("mongo@1.0.8", ["server", "client"]);
    api.use("twbs:bootstrap@3.3.5", 'client');
    api.use("fortawesome:fontawesome@4.2.0", 'client');
    api.use("netanelgilad:excel@0.2.4", "server");
    api.use("netanelgilad:node-uuid@1.0.2", "server");
    api.use("netanelgilad:mkdirp@0.0.1", "server");
    api.use("tmeasday:publish-counts@0.7.1", ["server", "client"]);
    api.use("akora:select2@4.0.6-rc.1", "client");
    api.use("rajit:bootstrap3-datepicker@1.7.1", "client");
    api.use("momentjs:moment@2.10.6", ["server", "client"]);
    api.use("suxez:jquery-serialize-object@1.0.0", "client");
    api.use("awatson1978:browser-detection@1.0.3", "client");

    api.addFiles(['lib/MeteorTable.html', 'lib/MeteorTable.css'], 'client');
    api.addFiles('lib/MeteorTable.js', ['client', 'server']);
    api.addFiles('lib/MeteorTableClient.js', 'client');
    api.addFiles('lib/MeteorTableServer.js', 'server');

    api.export('MeteorTable', ['client', 'server']);
});

Cordova.depends({
    "cordova-plugin-datepicker": "0.9.2",
    "cordova-plugin-keyboard": "1.1.4"
});
