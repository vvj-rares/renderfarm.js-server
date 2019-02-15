import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IFactory, IMaxscriptClient } from "../../interfaces";
import { TYPES } from "../../types";

@injectable()
class ThreeMaterialEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IFactory<IMaxscriptClient>;

    private _materialsJson: { [sessionGuid: string] : any; } = {};

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IFactory<IMaxscriptClient>) 
    {
        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/material/:uuid`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve material ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three/material`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // accept posted material ${uuid}`);

            res.status(201);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.put(`/v${this._settings.majorVersion}/three/material/:uuid`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`PUT on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // accept updated material ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/three/material/:uuid`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`DELETE on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // delete material ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));
    }
}

export { ThreeMaterialEndpoint };