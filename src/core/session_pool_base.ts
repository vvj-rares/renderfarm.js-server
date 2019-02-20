import { injectable } from "inversify";
import { ISessionPool, ISessionService, SessionServiceEvents } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export abstract class SessionPoolBase<T> implements ISessionPool<T> {
    private _sessionService: ISessionService;
    private _itemFactory: (session: Session) => Promise<T>;

    private _items: { [sessionGuid: string] : T; } = {};

    public async Get(session: Session): Promise<T> {
        if (this._items[session.guid]) {
            return this._items[session.guid];
        } else {
            return this._create(session);
        }
    }

    public FindOne(lookup: (obj: T) => boolean): T {
        for (let s in this._items) {
            let item = this._items[s];
            if (lookup(item)) {
                return item;
            }
        }
        return undefined;
    }

    public FindAll(lookup: (obj: T) => boolean): T[] {
        let all: T[] = [];
        for (let s in this._items) {
            let item = this._items[s];
            if (lookup(item)) {
                all.push(item);
            }
        }
        return all;
    }

    protected constructor(
        sessionService: ISessionService,
        itemFactory: (session: Session) => Promise<T>,
    ) {
        this._sessionService = sessionService;
        this._itemFactory = itemFactory;

        this._sessionService.on(SessionServiceEvents.Closed, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Expired, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Failed, this.onSessionClosed.bind(this));
    }

    private async _create(session: Session): Promise<T> {
        if (this._items[session.guid]) {
            throw Error("item already exists");
        }

        let item: T = await this._itemFactory(session);

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

