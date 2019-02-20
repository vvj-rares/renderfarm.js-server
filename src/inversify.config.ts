import { Container, decorate, injectable } from "inversify";

import { TYPES } from "./types";

import "reflect-metadata";
///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";
decorate(injectable(), EventEmitter);

import { Database } from "./database/database";
import { App } from "./app";
import { SessionEndpoint } from "./endpoints/session";
import { JobEndpoint } from "./endpoints/job";
import { WorkerEndpoint } from "./endpoints/worker";
import { MaxscriptClientFactory } from "./factories/maxscript_client_factory";
import { WorkspaceFileEndpoint } from "./endpoints/workspace.file";
import { RenderOutputEndpoint } from "./endpoints/renderoutput";
import { Settings } from "./settings";
import { ThreeObjectEndpoint } from "./endpoints/three/three.object";
import { ThreeGeometryEndpoint } from "./endpoints/three/three.geometry";
import { ThreeMaterialEndpoint } from "./endpoints/three/three.material";
import { SessionService } from "./services/session_service";
import { JobService } from "./services/job_service";
import { WorkerService } from "./services/worker_service";
import { MaxScriptClientPool } from "./services/pools/maxscript_client_pool";
import { IMaxscriptClient, IThreeMaxscriptBridge, IGeometryCache, ISessionPool, IMaterialCache, IDatabase, IApp, IEndpoint, IWorkerService, IJobService, ISessionService, IFactory, ISceneObjectBindingFactory, IGeometryBinding, IMaterialBinding, ISettings } from "./interfaces";
import { ThreeMaxscriptBridgePool } from "./services/pools/three_maxscript_bridge_pool";
import { ThreeMaxscriptBridgeFactory } from "./factories/three_maxscript_bridge_factory";
import { GeometryCachePool } from "./services/pools/geometry_cache_pool";
import { MaterialCachePool } from "./services/pools/material_cache_pool";
import { SceneBindingFactory } from "./factories/three_maxscript_bindings/scene_binding_factory";
import { SpotLightBindingFactory } from "./factories/three_maxscript_bindings/spotlight_binding_factory";
import { PerspectiveCameraBindingFactory } from "./factories/three_maxscript_bindings/perspective_camera_binding_factory";
import { MeshBindingFactory } from "./factories/three_maxscript_bindings/mesh_binding_factory";
import { LineSegmentsBindingFactory } from "./factories/three_maxscript_bindings/line_segments_binding_factory";
import { GeometryBindingFactory } from "./factories/three_maxscript_bindings/geometry_binding_factory";
import { MaterialBindingFactory } from "./factories/three_maxscript_bindings/material_binding_factory";
import { GeometryCacheFactory } from "./factories/three_maxscript_bindings/geometry_cache_factory";
import { MaterialCacheFactory } from "./factories/three_maxscript_bindings/material_cache_factory";

const myContainer = new Container();

// core
myContainer.bind<IDatabase>(TYPES.IDatabase).to(Database).inSingletonScope();
myContainer.bind<IApp>(TYPES.IApp).to(App).inSingletonScope();

// endpoints
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(SessionEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(JobEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(WorkerEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(WorkspaceFileEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(RenderOutputEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(ThreeObjectEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(ThreeGeometryEndpoint).inSingletonScope();
myContainer.bind<IEndpoint>(TYPES.IEndpoint).to(ThreeMaterialEndpoint).inSingletonScope();

// services
myContainer.bind<IWorkerService>(TYPES.IWorkerService).to(WorkerService).inSingletonScope();
myContainer.bind<IJobService>(TYPES.IJobService).to(JobService).inSingletonScope();
myContainer.bind<ISessionService>(TYPES.ISessionService).to(SessionService).inSingletonScope();

// pools
myContainer.bind<ISessionPool<IMaxscriptClient>>(TYPES.IMaxscriptClientPool).to(MaxScriptClientPool).inSingletonScope();
myContainer.bind<ISessionPool<IThreeMaxscriptBridge>>(TYPES.IThreeMaxscriptBridgePool).to(ThreeMaxscriptBridgePool).inSingletonScope();
myContainer.bind<ISessionPool<IGeometryCache>>(TYPES.IGeometryCachePool).to(GeometryCachePool).inSingletonScope();
myContainer.bind<ISessionPool<IMaterialCache>>(TYPES.IMaterialCachePool).to(MaterialCachePool).inSingletonScope();

// factories
myContainer.bind<IFactory<IMaxscriptClient>>(TYPES.IMaxscriptClientFactory).to(MaxscriptClientFactory).inSingletonScope();
myContainer.bind<IFactory<IThreeMaxscriptBridge>>(TYPES.IThreeMaxscriptBridgeFactory).to(ThreeMaxscriptBridgeFactory).inSingletonScope();

myContainer.bind<ISceneObjectBindingFactory>(TYPES.ISceneObjectBindingFactory).to(SceneBindingFactory).inSingletonScope();
myContainer.bind<ISceneObjectBindingFactory>(TYPES.ISceneObjectBindingFactory).to(SpotLightBindingFactory).inSingletonScope();
myContainer.bind<ISceneObjectBindingFactory>(TYPES.ISceneObjectBindingFactory).to(PerspectiveCameraBindingFactory).inSingletonScope();
myContainer.bind<ISceneObjectBindingFactory>(TYPES.ISceneObjectBindingFactory).to(MeshBindingFactory).inSingletonScope();
myContainer.bind<ISceneObjectBindingFactory>(TYPES.ISceneObjectBindingFactory).to(LineSegmentsBindingFactory).inSingletonScope();

myContainer.bind<IFactory<IGeometryCache>>(TYPES.IGeometryCacheFactory).to(GeometryCacheFactory).inSingletonScope();
myContainer.bind<IFactory<IMaterialCache>>(TYPES.IMaterialCacheFactory).to(MaterialCacheFactory).inSingletonScope();

myContainer.bind<IFactory<IGeometryBinding>>(TYPES.IGeometryBindingFactory).to(GeometryBindingFactory).inSingletonScope();
myContainer.bind<IFactory<IMaterialBinding>>(TYPES.IMaterialBindingFactory).to(MaterialBindingFactory).inSingletonScope();



// tip: this is how to export same instance with different interfaces
// EXAMPLE: myContainer.bind<ISessionObserver>(TYPES.ISessionObserver).toService(TYPES.ISessionObserver);
// ===

// now bind settings
let env: string;
try {
    env = process.argv.find(e => e.match(/env=(test|dev|acc|prod)/) !== null ).split("=")[1];
} catch {
    env = "dev";
}
console.log("Current Environment: ", env);
myContainer.bind<ISettings>(TYPES.ISettings).toConstantValue(new Settings(env));

export { myContainer };