module.exports = {
    version: "1.0.1",
    host: "192.168.0.1", // where the api is hosted in local network?
    port: 8000,          // internal tcp port
    publicUrl: "https://example.com", //how to access rest api from outside?
    connectionUrl: 'mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb',
    databaseName: 'rfarmdb',
    sslKey: "../ssl/key.pem",
    sslCert: "../ssl/cert.pem",
    renderOutputDir: "\\\\192.168.0.1\\renderoutput", // where to save render output?
    apiKeyCheck: true,
    workspaceCheck: true,
    workgroup: "default" // it helps to resolve which workers belong to which api instance
};
