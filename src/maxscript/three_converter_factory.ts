import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, IThreeConverter, IMaxscriptClientPool } from "../interfaces";
import { ThreeConverter } from "./three_converter";

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
