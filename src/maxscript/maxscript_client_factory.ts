import { injectable } from "inversify";
import { IMaxscriptClient, IFactory } from "../interfaces";
import { MaxscriptClient } from "./maxscript_client";

@injectable()
export class MaxscriptClientFactory implements IFactory<IMaxscriptClient> {
    public async Create(): Promise<IMaxscriptClient> {
        return new MaxscriptClient();
    }
}
