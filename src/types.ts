const TYPES = {
    // core interfaces
    IApp: Symbol.for("IApp"),
    ISettings: Symbol.for("ISettings"),
    IDatabase: Symbol.for("IDatabase"),
    IEndpoint: Symbol.for("IEndpoint"),

    // factories
    IMaxscriptClientFactory: Symbol.for("IFactory<IMaxscriptClient>"),
    IThreeMaxscriptBridgeFactory: Symbol.for("IFactory<IThreeMaxscriptBridge>"),

    // services
    IWorkerService: Symbol.for("IWorkerService"),
    IJobService: Symbol.for("IJobService"),
    ISessionService: Symbol.for("ISessionService"),
    IMaxscriptClientPool: Symbol.for("ISessionPool<IMaxscriptClient>"),
    IThreeMaxscriptBridgePool: Symbol.for("ISessionPool<IThreeMaxscriptBridge>"),

    // bindings
    ISceneObjectBinding: Symbol.for("ISceneObjectBinding"),
};

export { TYPES };
