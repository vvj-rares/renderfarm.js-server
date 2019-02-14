import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IMaxscriptThreeConnector, IFactory, IMaxscriptConnectionPool, IMaxscriptClient } from "../interfaces";
import { MaxscriptThreeConnector } from "./maxscript_three_connector";

@injectable()
export class MaxscriptThreeConnectorFactory implements IFactory<IMaxscriptThreeConnector> {
    private _maxscriptConnectionPool: IMaxscriptConnectionPool;

    constructor(
        @inject(TYPES.IMaxscriptConnectionPool) maxscriptConnectionPool: IMaxscriptConnectionPool,
    ) {
        this._maxscriptConnectionPool = maxscriptConnectionPool;
    }

    public create(sessionGuid: string): IMaxscriptThreeConnector {
        let maxscript: IMaxscriptClient = this._maxscriptConnectionPool.Get(sessionGuid);
        return new MaxscriptThreeConnector(maxscript);
    }
}
