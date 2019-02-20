import { injectable, inject } from "inversify";
import { ISceneObjectBindingFactory, IMaxscriptClient, ISceneObjectBinding, ISessionPool } from "../../interfaces";
import { TYPES } from "../../types";
import { Session } from "../../database/model/session";
import { PerspectiveCameraBinding } from "../../maxscript/three_maxscript_bindings/perspective_camera_binding";

@injectable()
export class PerspectiveCameraBindingFactory implements ISceneObjectBindingFactory {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;
    
    public constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public get SrcType(): string { return PerspectiveCameraBinding.SrcType }
    public get DstType(): string { return PerspectiveCameraBinding.DstType }

    public async Create(session: Session): Promise<ISceneObjectBinding>
    {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        return new PerspectiveCameraBinding(maxscript, null, null);
    }
}
