const TYPES = {
    // core interfaces
    IApp: Symbol.for("IApp"),
    ISettings: Symbol.for("ISettings"),
    IDatabase: Symbol.for("IDatabase"),
    IEndpoint: Symbol.for("IEndpoint"),

    // factories
    IMaxscriptClientFactory: Symbol.for("IFactory<IMaxscriptClient>"),
    IThreeMaxscriptBridgeFactory: Symbol.for("IFactory<IThreeMaxscriptBridge>"),
    ISceneObjectBindingFactory: Symbol.for("ISceneObjectBindingFactory"),

    IGeometryBindingFactory: Symbol.for("IFactory<IGeometryBinding>"),
    IMaterialBindingFactory: Symbol.for("IFactory<IMaterialBinding>"),

    IGeometryCacheFactory: Symbol.for("IFactory<IGeometryCache>"),
    IMaterialCacheFactory: Symbol.for("IFactory<IMaterialCache>"),

    // services
    IWorkerService: Symbol.for("IWorkerService"),
    IJobService: Symbol.for("IJobService"),
    ISessionService: Symbol.for("ISessionService"),
    IMaxscriptClientPool: Symbol.for("ISessionPool<IMaxscriptClient>"),
    IThreeMaxscriptBridgePool: Symbol.for("ISessionPool<IThreeMaxscriptBridge>"),
    IGeometryCachePool: Symbol.for("ISessionPool<IGeometryCache>"),
    IMaterialCachePool: Symbol.for("ISessionPool<IMaterialCache>"),
};

export { TYPES };
