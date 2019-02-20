import { injectable, inject } from "inversify";
import { TYPES } from "../../types";
import { IMaxscriptClient, IMaterialBinding, IFactory, ISessionPool } from "../../interfaces";
import { MaterialBinding } from "../../maxscript/three_maxscript_bindings/material_binding";
import { Session } from "../../database/model/session";

@injectable()
export class MaterialBindingFactory implements IFactory<IMaterialBinding> {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;
    
    public constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public async Create(session: Session): Promise<IMaterialBinding> 
    {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        return new MaterialBinding(maxscript);
    }
}
