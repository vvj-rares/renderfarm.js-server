import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, ISessionService, SessionServiceEvents, IFactory, IMaxscriptClient } from "../../interfaces";
import { TYPES } from "../../types";
import { Session } from "../../database/model/session";
import { EndpointHelpers } from "../../utils/endpoint_helpers";

const LZString = require("lz-string");

@injectable()
class ThreeObjectEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _sessionService: ISessionService;
    private _maxscriptClientFactory: IFactory<IMaxscriptClient>;

    private _objects: { [sessionGuid: string] : any; } = {};

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.ISessionService) sessionService: ISessionService,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IFactory<IMaxscriptClient>) 
    {
        this._settings = settings;
        this._database = database;
        this._sessionService = sessionService;
        this._maxscriptClientFactory = maxscriptClientFactory;

        this._sessionService.on(SessionServiceEvents.Closed, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Expired, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Failed, this.onSessionClosed.bind(this));
    }

    private onSessionClosed(session: Session) {
        delete this._objects[session.guid];
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/:uuid`, async function (req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three`, async function (req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            // check that session is actually open
            let session: Session = await EndpointHelpers.tryGetSession(sessionGuid, this._database, res);
            if (!session) {
                return;
            }

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

            if (!sceneJson.metadata) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "object missing metadata", error: null }, null, 2));
                return;
            }

            if (sceneJson.metadata.version !== 4.5) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "object version not supported (expected 4.5)", error: null }, null, 2));
                return;
            }

            if (sceneJson.metadata.type !== "Object") {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "object type not supported, expected 'Object'", error: null }, null, 2));
                return;
            }

            if (sceneJson.metadata.generator !== "Object3D.toJSON") {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "unexpected generator, expected 'Object3D.toJSON'", error: null }, null, 2));
                return;
            }

            if (!sceneJson.object) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "object is missing", error: null }, null, 2));
                return;
            }

            if (this._objects[sessionGuid]) {
                this._objects[sessionGuid] = sceneJson;

                this._maxScriptAdapter.postScene(sceneJson.object);
            }

            // todo: check that this object is not exist yet
            // todo: check that this object is of supported type
            // todo: cache json is it is
            // todo: if this is a scene object, => reopen scene in 3ds max
            // todo: if this is not a scene object, => find parent and inject as a child

            // todo: traverse all children and create 3ds max objects by three.js objects, remember uuids and cache all necessary data
            // todo: this is a good place for plugin, as this step converts json to worker text commands and must be replaceable

            res.status(201);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.put(`/v${this._settings.majorVersion}/three/:uuid`, async function (req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`PUT on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // accept updated object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/three/:uuid`, async function (req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`DELETE on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // delete material ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));
    }
}

export { ThreeObjectEndpoint };