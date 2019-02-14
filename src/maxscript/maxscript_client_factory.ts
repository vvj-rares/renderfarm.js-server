import { injectable } from "inversify";
import { IMaxscriptClient, IFactory } from "../interfaces";
import { MaxscriptClient } from "./maxscript_client";

@injectable()
class MaxscriptClientFactory implements IFactory<IMaxscriptClient> {
    create(): IMaxscriptClient {
        return new MaxscriptClient();
    }
}

export { MaxscriptClientFactory };
