import { injectable, inject } from "inversify";
import { ISceneObjectBindingFactory, IMaxscriptClient, ISceneObjectBinding, ISessionPool, IGeometryBinding } from "../../interfaces";
import { LineSegmentsBinding } from "../../maxscript/three_maxscript_bindings/line_segments_binding";
import { TYPES } from "../../types";
import { Session } from "../../database/model/session";

@injectable()
export class LineSegmentsBindingFactory implements ISceneObjectBindingFactory {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;
    
    public constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public get SrcType(): string { return LineSegmentsBinding.SrcType }
    public get DstType(): string { return LineSegmentsBinding.DstType }

    public async Create(session: Session): Promise<ISceneObjectBinding>
    {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        return new LineSegmentsBinding(maxscript);
    }
}
