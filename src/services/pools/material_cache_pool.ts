import { injectable, inject } from "inversify";
import { TYPES } from "../../types";
import { IFactory, ISessionService, IMaterialCache } from "../../interfaces";

import { Session } from "../../database/model/session";
import { SessionPoolBase } from "../../core/session_pool_base";

@injectable()
export class MaterialCachePool extends SessionPoolBase<IMaterialCache> {

    constructor(
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IMaterialCacheFactory) sessionMaterialCacheFactory: IFactory<IMaterialCache>,
    ) {
        super(sessionService, sessionMaterialCacheFactory.Create.bind(sessionMaterialCacheFactory));

        this.id = Math.random();
        console.log(" >> MaterialCachePool: ", this.id);
    }

    public id: number;

    protected async onBeforeItemAdd(session: Session, materialCache: IMaterialCache): Promise<boolean> {
        return true;
    }

    protected async onBeforeItemRemove(closedSession: Session, materialCache: IMaterialCache): Promise<any> {
        // do nothing
    }
}
