import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, IThreeConverter, ISessionPool } from "../interfaces";
import { ThreeConverter } from "./three_converter";

@injectable()
export class ThreeConverterFactory implements IFactory<IThreeConverter> {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;

    constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public create(sessionGuid: string): IThreeConverter {
        let maxscript: IMaxscriptClient = this._maxscriptClientPool.Get(sessionGuid);
        return new ThreeConverter(maxscript);
    }
}
