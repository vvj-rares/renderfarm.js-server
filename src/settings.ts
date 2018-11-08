module.exports = {
    version: "1.0.0.0",
    port: 8000,
    connectionUrl: 'mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb',
    sslKey: "../ssl/key.pem",
    sslCert: "../ssl/cert.pem",
    sftpHost: "192.168.0.151",
    sftpPort: 22,
    sftpUsername: "rfarm",
    sftpPassword: "123456",
    storageBaseUrl: "http://192.168.0.151",
    storageBaseDir: "/var/www/html/rfarm"
};