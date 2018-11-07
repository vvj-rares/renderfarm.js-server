import { Container } from "inversify";
import { TYPES } from "./types";
import * as interfaces from "./interfaces";
import { Ninja, Katana, Shuriken } from "./entities";
import { Database } from "./database/database";
import { App } from "./app";
import { ProjectEndpoint } from "./endpoints/project.endpoint";

const myContainer = new Container();
myContainer.bind<interfaces.Warrior>(TYPES.Warrior).to(Ninja);
myContainer.bind<interfaces.Weapon>(TYPES.Weapon).to(Katana);
myContainer.bind<interfaces.ThrowableWeapon>(TYPES.ThrowableWeapon).to(Shuriken);
myContainer.bind<interfaces.IDatabase>(TYPES.IDatabase).to(Database).inSingletonScope();
myContainer.bind<interfaces.IApp>(TYPES.IApp).to(App);

myContainer.bind<interfaces.IEndpoint>(TYPES.IEndpoint).to(ProjectEndpoint);

export { myContainer };