module.exports = function() {
    return;

    var reporters = require('jasmine-reporters');
    var reporter = new reporters.TeamCityReporter({
        savePath: __dirname,
        consolidateAll: true
    });
    jasmine.getEnv().clearReporters();
    jasmine.getEnv().addReporter(reporter);
};