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
import { MaxScriptClientPool } from "./services/maxscript_client_pool";
import { IMaxscriptClient, IThreeMaxscriptBridge } from "./interfaces";
import { ThreeMaxscriptBridgePool } from "./services/three_maxscript_bridge_pool";
import { ThreeMaxscriptBridgeFactory } from "./maxscript/three_maxscript_bridge_factory";
import { SceneBinding } from "./maxscript/three_maxscript_bindings/scene_binding";

const myContainer = new Container();

// core
myContainer.bind<interfaces.IDatabase>(TYPES.IDatabase).to(Database).inSingletonScope();
myContainer.bind<interfaces.IApp>(TYPES.IApp).to(App).inSingletonScope();

// endpoints
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SessionEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(JobEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkerEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkspaceFileEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(RenderOutputEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeObjectEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeGeometryEndpoint).inSingletonScope();
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeMaterialEndpoint).inSingletonScope();

// services
myContainer.bind<interfaces.IWorkerService>(TYPES.IWorkerService).to(WorkerService).inSingletonScope();
myContainer.bind<interfaces.IJobService>(TYPES.IJobService).to(JobService).inSingletonScope();
myContainer.bind<interfaces.ISessionService>(TYPES.ISessionService).to(SessionService).inSingletonScope();

// pools
myContainer.bind<interfaces.ISessionPool<IMaxscriptClient>>(TYPES.IMaxscriptClientPool).to(MaxScriptClientPool).inSingletonScope();
myContainer.bind<interfaces.ISessionPool<IThreeMaxscriptBridge>>(TYPES.IThreeMaxscriptBridgePool).to(ThreeMaxscriptBridgePool).inSingletonScope();

// factories
myContainer.bind<interfaces.IFactory<interfaces.IMaxscriptClient>>(TYPES.IMaxscriptClientFactory).to(MaxscriptClientFactory).inSingletonScope();
myContainer.bind<interfaces.IFactory<interfaces.IThreeMaxscriptBridge>>(TYPES.IThreeMaxscriptBridgeFactory).to(ThreeMaxscriptBridgeFactory).inSingletonScope();

// bindings
myContainer.bind<interfaces.ISceneObjectBinding>(TYPES.ISceneObjectBinding).to(SceneBinding);

// tip: this is how to export same instance with different interfaces
// EXAMPLE: myContainer.bind<interfaces.ISessionObserver>(TYPES.ISessionObserver).toService(TYPES.ISessionObserver);
// ===

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