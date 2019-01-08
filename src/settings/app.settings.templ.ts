module.exports = {
    "version": "1.0.3",
    "common": {
        "host": "localhost",
        "port": 8000,
        "workerManagerPort": 17900,
        "publicUrl": "https://localhost:8000",
        "connectionUrl": "mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb",
        "databaseName": "rfarmdb",
        "collectionPrefix": "",
        "sslKey": "ssl/key.pem",
        "sslCert": "ssl/cert.pem",
        "renderOutputDir": "C:\\\\Temp",
        "renderOutputLocal": "C:\\\\Temp",
        "apiKeyCheck": true,
        "workspaceCheck": true,
        "deleteDeadWorkers": false,
        "workgroup": "default"
    },
    "dev": {
        "collectionPrefix": "_dev"
    },
    "acc": {
        "collectionPrefix": "_acc"
    },
    "prod": {
        "collectionPrefix": "_prod"
    },
    "test": {
        "collectionPrefix": "_test"
    }
};