import { Container, decorate, injectable } from "inversify";

import { TYPES } from "./types";
import * as interfaces from "./interfaces";

import "reflect-metadata";
///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";
decorate(injectable(), EventEmitter);

import { Database } from "./database/database";
import { App } from "./app";
import { SessionEndpoint } from "./endpoints/session";
import { JobEndpoint } from "./endpoints/job";
import { WorkerEndpoint } from "./endpoints/worker";
import { MaxscriptClientFactory } from "./maxscript/maxscript_client_factory";
import { WorkspaceFileEndpoint } from "./endpoints/workspace.file";
import { RenderOutputEndpoint } from "./endpoints/renderoutput";
import { Settings } from "./settings";
import { ThreeObjectEndpoint } from "./endpoints/three/three.object";
import { ThreeGeometryEndpoint } from "./endpoints/three/three.geometry";
import { ThreeMaterialEndpoint } from "./endpoints/three/three.material";
import { SessionService } from "./services/session_service";
import { JobService } from "./services/job_service";
import { WorkerService } from "./services/worker_service";
import { MaxScriptConnectionPool } from "./maxscript/maxscript_connection_pool";
import { MaxscriptThreeConnectorFactory } from "./maxscript/maxscript_three_connector_factory";
import { MaxscriptThreeConnectorPool } from "./maxscript/maxscript_three_connector_pool";

const myContainer = new Container();

myContainer.bind<interfaces.IDatabase>(TYPES.IDatabase).to(Database).inSingletonScope();
myContainer.bind<interfaces.IApp>(TYPES.IApp).to(App);

//endpoints
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SessionEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(JobEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkerEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkspaceFileEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(RenderOutputEndpoint);

// myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneEndpoint);
// myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneCameraEndpoint);
// myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneLightEndpoint);
// myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneMaterialEndpoint);
// myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneGeometryEndpoint);
// myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneMeshEndpoint);

myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeObjectEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeGeometryEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeMaterialEndpoint);

//services
myContainer.bind<interfaces.IWorkerService>(TYPES.IWorkerService).to(WorkerService).inSingletonScope();
myContainer.bind<interfaces.IJobService>(TYPES.IJobService).to(JobService).inSingletonScope();
myContainer.bind<interfaces.ISessionService>(TYPES.ISessionService).to(SessionService).inSingletonScope();
myContainer.bind<interfaces.IMaxscriptConnectionPool>(TYPES.IMaxscriptConnectionPool).to(MaxScriptConnectionPool).inSingletonScope();
myContainer.bind<interfaces.IMaxscriptThreeConnectorPool>(TYPES.IMaxscriptThreeConnectorPool).to(MaxscriptThreeConnectorPool).inSingletonScope();



// tip: this is how to export same instance with different interfaces
// EXAMPLE: myContainer.bind<interfaces.ISessionObserver>(TYPES.ISessionObserver).toService(TYPES.ISessionObserver);

myContainer.bind<interfaces.IFactory<interfaces.IMaxscriptClient>>(TYPES.IMaxscriptClientFactory).to(MaxscriptClientFactory);
myContainer.bind<interfaces.IFactory<interfaces.IMaxscriptThreeConnector>>(TYPES.IMaxscriptThreeConnectorFactory).to(MaxscriptThreeConnectorFactory);

// now bind settings
let env: string;
try {
    env = process.argv.find(e => e.match(/env=(test|dev|acc|prod)/) !== null ).split("=")[1];
} catch {
    env = "dev";
}
console.log("Current Environment: ", env);
myContainer.bind<interfaces.ISettings>(TYPES.ISettings).toConstantValue(new Settings(env));

export { myContainer };