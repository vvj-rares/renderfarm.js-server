import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, IThreeConverter, ISessionPool } from "../interfaces";
import { ThreeConverter } from "./three_converter";
import { Session } from "../database/model/session";

@injectable()
export class ThreeConverterFactory implements IFactory<IThreeConverter> {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;

    constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public async Create(session: Session): Promise<IThreeConverter> {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        return new ThreeConverter(maxscript);
    }
}
