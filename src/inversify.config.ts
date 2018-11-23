import { Container } from "inversify";
import { TYPES } from "./types";
import * as interfaces from "./interfaces";
import { Ninja, Katana, Shuriken } from "./entities";
import { Database } from "./database/database";
import { App } from "./app";
import { SessionEndpoint } from "./endpoints/session";
import { SceneEndpoint } from "./endpoints/scene";
import { SceneCameraEndpoint } from "./endpoints/scene.camera";
import { SceneLightEndpoint } from "./endpoints/scene.light";
import { SceneMeshEndpoint } from "./endpoints/scene.mesh";
import { Checks } from "./utils/checks";
import { RenderOutputEndpoint } from "./endpoints/render_output";
import { JobEndpoint } from "./endpoints/job";
import { WorkerEndpoint } from "./endpoints/worker";
import { MaxscriptClientFactory } from "./maxscript_client/maxscript.client.factory";
import { SceneMaterialEndpoint } from "./endpoints/scene.material";

const myContainer = new Container();
myContainer.bind<interfaces.Warrior>(TYPES.Warrior).to(Ninja);
myContainer.bind<interfaces.Weapon>(TYPES.Weapon).to(Katana);
myContainer.bind<interfaces.ThrowableWeapon>(TYPES.ThrowableWeapon).to(Shuriken);

myContainer.bind<interfaces.IChecks>(TYPES.IChecks).to(Checks);
myContainer.bind<interfaces.IDatabase>(TYPES.IDatabase).to(Database).inSingletonScope();

myContainer.bind<interfaces.IApp>(TYPES.IApp).to(App);

myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SessionEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneCameraEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneLightEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneMeshEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(SceneMaterialEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(RenderOutputEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(JobEndpoint);
myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(WorkerEndpoint);

myContainer.bind<interfaces.IMaxscriptClientFactory>(TYPES.IMaxscriptClientFactory).to(MaxscriptClientFactory);

export { myContainer };