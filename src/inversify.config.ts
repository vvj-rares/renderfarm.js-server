import { Container } from "inversify";
import { TYPES } from "./types";
import * as interfaces from "./interfaces";
import { Database } from "./database/database";
import { App } from "./app";
import { SessionEndpoint } from "./endpoints/session";
import { SceneEndpoint } from "./endpoints/scene/scene";
import { SceneCameraEndpoint } from "./endpoints/scene/scene.camera";
import { SceneLightEndpoint } from "./endpoints/scene/scene.light";
import { SceneMeshEndpoint } from "./endpoints/scene/scene.mesh";
import { JobEndpoint } from "./endpoints/job";
import { WorkerEndpoint } from "./endpoints/worker";
import { MaxscriptClientFactory } from "./maxscript_client/maxscript.client.factory";
import { SceneMaterialEndpoint } from "./endpoints/scene/scene.material";
import { SceneGeometryEndpoint } from "./endpoints/scene/scene.geometry";
import { WorkspaceFileEndpoint } from "./endpoints/workspace.file";
import { RenderOutputEndpoint } from "./endpoints/renderoutput";
import { WorkerHeartbeatListener } from "./services/worker_heartbeat_listener";
import { Settings } from "./settings";
import { ThreeObjectEndpoint } from "./endpoints/three/three.object";
import { ThreeGeometryEndpoint } from "./endpoints/three/three.geometry";
import { ThreeMaterialEndpoint } from "./endpoints/three/three.material";
import { JobHandler } from "./services/job_handler";
import { SessionWatchdog } from "./services/session_watchdog";

const myContainer = new Container();

myContainer.bind<interfaces.IDatabase>(TYPES.IDatabase).to(Database).inSingletonScope();
myContainer.bind<interfaces.IApp>(TYPES.IApp).to(App);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SessionEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(JobEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkerEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkspaceFileEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(RenderOutputEndpoint);

myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneCameraEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneLightEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneMaterialEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneGeometryEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneMeshEndpoint);

myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeObjectEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeGeometryEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ThreeMaterialEndpoint);

myContainer.bind<interfaces.IWorkerHeartbeatListener>(TYPES.IWorkerHeartbeatListener).to(WorkerHeartbeatListener).inSingletonScope();
myContainer.bind<interfaces.IWorkerObserver>(TYPES.IWorkerObserver).toService(TYPES.IWorkerHeartbeatListener);

myContainer.bind<interfaces.IJobHandler>(TYPES.IJobHandler).to(JobHandler).inSingletonScope();
myContainer.bind<interfaces.ISessionWatchdog>(TYPES.ISessionWatchdog).to(SessionWatchdog).inSingletonScope();

myContainer.bind<interfaces.IMaxscriptClientFactory>(TYPES.IMaxscriptClientFactory).to(MaxscriptClientFactory);

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