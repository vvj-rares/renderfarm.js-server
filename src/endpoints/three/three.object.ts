import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../../interfaces";
import { TYPES } from "../../types";
import { Session } from "../../database/model/session";
import { EndpointHelpers } from "../../utils/endpoint_helpers";

@injectable()
class ThreeObjectEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    private _objects: { [uuid: string] : THREE.Object3D; } = {};
    private _objectsJson: { [uuid: string] : any; } = {};

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) 
    {
        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/:uuid`, async function (req, res) {
            let sessionGuid = req.body.session;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three`, async function (req, res) {
            let sessionGuid = req.body.session;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            // check that session is actually open
            let session: Session = await EndpointHelpers.tryGetSession(sessionGuid, this._database, res);
            if (!session) {
                return;
            }

            // check that session has no active job, i.e. it is not being rendered
            if (session.workerRef && !session.workerRef.jobRef) {
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

            // todo: decompress json,
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
            let sessionGuid = req.body.session;
            console.log(`PUT on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // accept updated object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/three/:uuid`, async function (req, res) {
            let sessionGuid = req.body.session;
            console.log(`DELETE on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // delete material ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));
    }
}

export { ThreeObjectEndpoint };