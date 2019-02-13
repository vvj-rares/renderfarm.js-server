import { injectable } from "inversify";
import { IThree2MaxScriptConnector, IFactory } from "../interfaces";
import { Three2MaxScriptConnector } from "./three2maxscript_connector";

@injectable()
export class Three2MaxScriptConnectorFactory implements IFactory<IThree2MaxScriptConnector> {
    create(): IThree2MaxScriptConnector {
        return new Three2MaxScriptConnector();
    }
}
