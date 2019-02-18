import { injectable } from "inversify";
import { ISessionPool, ISessionService, SessionServiceEvents } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export abstract class SessionPoolBase<T> implements ISessionPool<T> {
    private _sessionService: ISessionService;
    private _itemFactory: (sessionGuid: string) => T;

    private _items: { [sessionGuid: string] : T; } = {};

    public Get(sessionGuid: string): T {
        return this._items[sessionGuid];
    }

    protected constructor(
        sessionService: ISessionService,
        itemFactory: (sessionGuid: string) => T,
    ) {
        this._sessionService = sessionService;
        this._itemFactory = itemFactory;

        this._sessionService.on(SessionServiceEvents.Created, this.onSessionCreated.bind(this));

        this._sessionService.on(SessionServiceEvents.Closed, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Expired, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Failed, this.onSessionClosed.bind(this));
    }

    private async  onSessionCreated(session: Session): Promise<T> {
        if (this._items[session.guid]) {
            throw Error("item already exists");
        }

        let item: T = this._itemFactory(session.guid);

        if (await this.onBeforeItemAdd(session, item)) {
            this._items[session.guid] = item;
            return item;
        } else {
            throw Error("failed to add item");
        }
    }

    private onSessionClosed(session: Session) {
        let item = this._items[session.guid];
        if (item === undefined) {
            return;
        }

        delete this._items[session.guid];
    }

    protected async abstract onBeforeItemAdd(session: Session, item: T): Promise<boolean>;
    protected async abstract onBeforeItemRemove(closedSession: Session, item: T): Promise<any>;
}

