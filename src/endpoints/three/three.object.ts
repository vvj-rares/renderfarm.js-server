import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, ISessionService, SessionServiceEvents, ISessionPool, IThreeConverter } from "../../interfaces";
import { TYPES } from "../../types";
import { Session } from "../../database/model/session";

const LZString = require("lz-string");

@injectable()
class ThreeObjectEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _sessionService: ISessionService;
    private _threeConverterPool: ISessionPool<IThreeConverter>;

    private _objects: { [sessionGuid: string] : any; } = {};

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.ISessionService) sessionService: ISessionService,
                @inject(TYPES.IThreeConverterPool) threeConverterPool: ISessionPool<IThreeConverter>,
    ) {
        this._settings = settings;
        this._database = database;
        this._sessionService = sessionService;
        this._threeConverterPool = threeConverterPool;

        this._sessionService.on(SessionServiceEvents.Closed, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Expired, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Failed, this.onSessionClosed.bind(this));
    }

    private onSessionClosed(session: Session) {
        delete this._objects[session.guid];
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/:uuid`, async function (this: ThreeObjectEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three`, async function (this: ThreeObjectEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            // check that session is actually open
            let session: Session = await this._sessionService.GetSession(sessionGuid, false, false);
            if (!session) {
                return;
            }

            console.log(" >> session: ", session);

            // check that session has no active job, i.e. it is not being rendered
            if (session.workerRef && session.workerRef.jobRef) {
                res.status(403);
                res.end(JSON.stringify({ ok: false, message: "changes forbidden, session is being rendered", error: null }, null, 2));
                return;
            }

            let compressedJson = req.body.compressed_json; // this is to create scene or add new obejcts to scene
            if (!compressedJson) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing compressed_json", error: null }, null, 2));
                return;
            }

            let sceneJsonText = LZString.decompressFromBase64(compressedJson);
            let sceneJson: any = JSON.parse(sceneJsonText);

            if (!this.validateSceneJson(sceneJson, res)) {
                return;
            }

            // cache it now
            if (this._objects[session.guid]) {
                this._objects[session.guid] = sceneJson;
            }

            let threeConverter = await this._threeConverterPool.Get(session);
            try {
                await threeConverter.PostScene(sceneJson);
            } catch (err) {
                console.log(" >> ", err);

                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to post scene to 3ds max", error: err.message }, null, 2));
                return;
            }

            res.status(201);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.put(`/v${this._settings.majorVersion}/three/:uuid`, async function (this: ThreeObjectEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`PUT on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // accept updated object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/three/:uuid`, async function (this: ThreeObjectEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`DELETE on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // delete material ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));
    }

    private validateSceneJson(sceneJson, res): boolean {
        if (!sceneJson.metadata) {
            res.status(400);
            res.end(JSON.stringify({ ok: false, message: "object missing metadata", error: null }, null, 2));
            return false;
        }

        if (sceneJson.metadata.version !== 4.5) {
            res.status(400);
            res.end(JSON.stringify({ ok: false, message: "object version not supported (expected 4.5)", error: null }, null, 2));
            return false;
        }

        if (sceneJson.metadata.type !== "Object") {
            res.status(400);
            res.end(JSON.stringify({ ok: false, message: "object type not supported, expected 'Object'", error: null }, null, 2));
            return false;
        }

        if (sceneJson.metadata.generator !== "Object3D.toJSON") {
            res.status(400);
            res.end(JSON.stringify({ ok: false, message: "unexpected generator, expected 'Object3D.toJSON'", error: null }, null, 2));
            return false;
        }

        if (!sceneJson.object) {
            res.status(400);
            res.end(JSON.stringify({ ok: false, message: "object is missing", error: null }, null, 2));
            return false;
        }

        return true;
    }
}

export { ThreeObjectEndpoint };