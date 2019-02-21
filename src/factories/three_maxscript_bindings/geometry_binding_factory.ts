import { injectable, inject } from "inversify";
import { TYPES } from "../../types";
import { IMaxscriptClient, IGeometryBinding, IFactory, ISessionPool } from "../../interfaces";
import { GeometryBinding } from "../../maxscript/three_maxscript_bindings/geometry_binding";
import { Session } from "../../database/model/session";

@injectable()
export class GeometryBindingFactory implements IFactory<IGeometryBinding> {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;

    public constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public async Create(session: Session, ...args: any[]): Promise<IGeometryBinding> 
    {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        let geometryJson = args[0];

        return new GeometryBinding(maxscript, geometryJson);
    }
}
