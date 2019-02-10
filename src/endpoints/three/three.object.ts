import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../../interfaces";
import { TYPES } from "../../types";

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

            let uuid = req.params.uuid;
            console.log(`todo: // accept posted object ${uuid}`);

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
            console.log(`todo: // delete object ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));
    }
}

export { ThreeObjectEndpoint };