const TYPES = {
    ISettings: Symbol.for("ISettings"),
    IDatabase: Symbol.for("IDatabase"),
    IApp: Symbol.for("IApp"),
    IEndpoint: Symbol.for("IEndpoint"),
    // IChecks: Symbol.for("IChecks"),
    IMaxscriptClient: Symbol.for("IMaxscriptClient"),
    IMaxscriptClientFactory: Symbol.for("IMaxscriptClientFactory"),
    IWorkerHeartbeatListener: Symbol.for("IWorkerHeartbeatListener"),

    // services
    IWorkerService: Symbol.for("IWorkerService"),
    IJobService: Symbol.for("IJobService"),
    ISessionService: Symbol.for("ISessionService"),
};

export { TYPES };
