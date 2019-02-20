import { injectable, inject } from "inversify";
import { ISceneObjectBindingFactory, IMaxscriptClient, ISceneObjectBinding, ISessionPool, IGeometryCache, IMaterialCache } from "../../interfaces";
import { TYPES } from "../../types";
import { Session } from "../../database/model/session";
import { MeshBinding } from "../../maxscript/three_maxscript_bindings/mesh_binding";

@injectable()
export class MeshBindingFactory implements ISceneObjectBindingFactory {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;
    private _geometryCachePool: ISessionPool<IGeometryCache>;
    private _materialCachePool: ISessionPool<IMaterialCache>;

    public constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
        @inject(TYPES.IGeometryCachePool) geometryCachePool: ISessionPool<IGeometryCache>,
        @inject(TYPES.IMaterialCachePool) materialCachePool: ISessionPool<IMaterialCache>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
        this._geometryCachePool = geometryCachePool;
        this._materialCachePool = materialCachePool;
    }

    public get SrcType(): string { return MeshBinding.SrcType }
    public get DstType(): string { return MeshBinding.DstType }

    public async Create(session: Session): Promise<ISceneObjectBinding>
    {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        let geometryCache = await this._geometryCachePool.Get(session);
        let materialCache = await this._materialCachePool.Get(session);
        return new MeshBinding(maxscript, geometryCache, materialCache);
    }
}
