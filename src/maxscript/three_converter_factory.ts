import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, IThreeConverter, IMaxscriptClientPool } from "../interfaces";
import { ThreeConverter } from "./maxscript_three_connector";

@injectable()
export class ThreeConverterFactory implements IFactory<IThreeConverter> {
    private _maxscriptClientPool: IMaxscriptClientPool;

    constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: IMaxscriptClientPool,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public create(sessionGuid: string): IThreeConverter {
        let maxscript: IMaxscriptClient = this._maxscriptClientPool.Get(sessionGuid);
        return new ThreeConverter(maxscript);
    }
}
