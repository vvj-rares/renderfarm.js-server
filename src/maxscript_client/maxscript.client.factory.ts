import { injectable } from "inversify";
import { IMaxscriptClientFactory, IMaxscriptClient } from "../interfaces";
import { MaxscriptClient } from "./maxscript.client";

@injectable()
class MaxscriptClientFactory implements IMaxscriptClientFactory {
    create(): IMaxscriptClient {
        return new MaxscriptClient();
    }
}

export { MaxscriptClientFactory };
