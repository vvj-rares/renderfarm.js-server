import { injectable } from "inversify";
import { IMaxscriptClient, IFactory } from "../interfaces";
import { MaxscriptClient } from "../maxscript/maxscript_client";
import { Session } from "../database/model/session";

@injectable()
export class MaxscriptClientFactory implements IFactory<IMaxscriptClient> {
    public async Create(session: Session): Promise<IMaxscriptClient> {
        return new MaxscriptClient();
    }
}
