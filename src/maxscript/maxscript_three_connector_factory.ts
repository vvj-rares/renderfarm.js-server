import { injectable } from "inversify";
import { IMaxscriptThreeConnector, IFactory } from "../interfaces";
import { MaxscriptThreeConnector } from "./maxscript_three_connector";

@injectable()
export class MaxscriptThreeConnectorFactory implements IFactory<IMaxscriptThreeConnector> {
    create(): IMaxscriptThreeConnector {
        return new MaxscriptThreeConnector();
    }
}
