module.exports = function() { return {
    version: "1.0.0",
    common: {
        workgroup: "default",
        host: "localhost",
        port: 8000,
        publicUrl: "https://localhost:8000",
        workerManagerPort: 17900, //WorkerManager REST API is hosted on this port
        heartbeatPort: 3000, //renderfarmjs-server API collects UDP heartbeats on this port
        sslKey: "ssl/key.pem",
        sslCert: "ssl/cert.pem",
        renderOutputDir: "C:\\Temp",
        renderOutputLocal: "C:\\Temp",
        apiKeyCheck: true,
        workspaceCheck: true,
        deleteDeadWorkers: true,
        expireSessions: true,
        sessionTimeoutMinutes: 30
    },
    dev: {
        connectionUrl: "mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb",
        databaseName: "rfarm-dev",
        collectionPrefix: "_dev",
        sessionTimeoutMinutes: 5,
        dropFolderUsername: "username",
        dropFolderPassword: "123456"
    },
    test: {
        connectionUrl: "mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb",
        databaseName: "rfarm-test",
        collectionPrefix: "_test",
        expireSessions: false,
        deleteDeadWorkers: false
    },
    prod: {
        publicUrl: "https://localhost:8000",
        connectionUrl: "mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb",
        databaseName: "rfarm-prod",
        collectionPrefix: "",
        workgroup: "default",
        host: "localhost",
        port: 8000,
        workerManagerPort: 17900,
        heartbeatPort: 3000,
        sslKey: "ssl/key.pem",
        sslCert: "ssl/cert.pem",
        renderOutputDir: "C:\\Temp",
        renderOutputLocal: "C:\\Temp",
        apiKeyCheck: true,
        workspaceCheck: true,
        deleteDeadWorkers: true,
        expireSessions: true,
        sessionTimeoutMinutes: 30
    }
} };