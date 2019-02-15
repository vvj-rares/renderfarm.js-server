const TYPES = {
    // core interfaces
    IApp: Symbol.for("IApp"),
    ISettings: Symbol.for("ISettings"),
    IDatabase: Symbol.for("IDatabase"),
    IEndpoint: Symbol.for("IEndpoint"),

    // factories
    IMaxscriptClientFactory: Symbol.for("IFactory<IMaxscriptClient>"),
    IMaxscriptThreeConnectorFactory: Symbol.for("IFactory<IMaxscriptThreeConnector>"),

    // services
    IWorkerService: Symbol.for("IWorkerService"),
    IJobService: Symbol.for("IJobService"),
    ISessionService: Symbol.for("ISessionService"),
    IMaxscriptConnectionPool: Symbol.for("IMaxscriptConnectionPool"),
    IMaxscriptThreeConnectorPool: Symbol.for("IMaxscriptThreeConnectorPool"),
};

export { TYPES };
