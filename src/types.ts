const TYPES = {
    // core interfaces
    IApp: Symbol.for("IApp"),
    ISettings: Symbol.for("ISettings"),
    IDatabase: Symbol.for("IDatabase"),
    IEndpoint: Symbol.for("IEndpoint"),

    // factories
    IMaxscriptClientFactory: Symbol.for("IFactory<IMaxscriptClient>"),
    IThreeConverterFactory: Symbol.for("IFactory<IThreeConverter>"),

    // services
    IWorkerService: Symbol.for("IWorkerService"),
    IJobService: Symbol.for("IJobService"),
    ISessionService: Symbol.for("ISessionService"),
    IMaxscriptClientPool: Symbol.for("ISessionPool<IMaxscriptClient>"),
    IThreeConverterPool: Symbol.for("ISessionPool<IThreeConverter>"),
};

export { TYPES };
