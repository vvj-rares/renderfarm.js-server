const TYPES = {
    // core interfaces
    IApp: Symbol.for("IApp"),
    ISettings: Symbol.for("ISettings"),
    IDatabase: Symbol.for("IDatabase"),
    IEndpoint: Symbol.for("IEndpoint"),

    // factories
    IMaxscriptClientFactory: Symbol.for("IFactory<IMaxscriptClient>"),
    IThree2MaxScriptConnectorFactory: Symbol.for("IFactory<IThree2MaxScriptConnector>"),

    // services
    IWorkerService: Symbol.for("IWorkerService"),
    IJobService: Symbol.for("IJobService"),
    ISessionService: Symbol.for("ISessionService"),
    IMaxScriptConnectionPoolService: Symbol.for("IMaxScriptConnectionPoolService"),
};

export { TYPES };
