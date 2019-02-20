import { injectable, inject } from "inversify";
import { TYPES } from "../../types";
import { IFactory, ISessionService, IGeometryCache } from "../../interfaces";

import { Session } from "../../database/model/session";
import { SessionPoolBase } from "../../core/session_pool_base";

@injectable()
export class GeometryCachePool extends SessionPoolBase<IGeometryCache> {

    constructor(
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IGeometryCacheFactory) geometryCacheFactory: IFactory<IGeometryCache>,
    ) {
        super(sessionService, geometryCacheFactory.Create.bind(geometryCacheFactory));

        this.id = Math.random();
        console.log(" >> GeometryCachePool: ", this.id);
    }

    public id: number;

    protected async onBeforeItemAdd(session: Session, geometryCache: IGeometryCache): Promise<boolean> {
        return true;
    }

    protected async onBeforeItemRemove(closedSession: Session, geometryCache: IGeometryCache): Promise<any> {
        // do nothing
    }
}
