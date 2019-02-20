import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IFactory, IMaxscriptClient } from "../../interfaces";
import { TYPES } from "../../types";
import { isArray } from "util";

const LZString = require("lz-string");

@injectable()
class ThreeMaterialEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IFactory<IMaxscriptClient>;

    // private _materialsJson: { [sessionGuid: string] : any; } = {};
    private _materialCache: any = {};

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

            let materialJson = this._materialCache[uuid];
            if (!materialJson) {
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "material not found", error: null }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify(materialJson));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three/material`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            let compressedJson = req.body.compressed_json;
            if (!compressedJson) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing compressed_json", error: null }, null, 2));
                return;
            }

            let materialJsonText = LZString.decompressFromBase64(compressedJson);
            let materialJson: any = JSON.parse(materialJsonText);

            let makeDownloadUrl = function(this: ThreeMaterialEndpoint, materialJson: any) {
                return `https://${this._settings.current.host}:${this._settings.current.port}/v${this._settings.majorVersion}/three/material/${materialJson.uuid}`;
            }.bind(this);

            if (isArray(materialJson)) {
                let data = [];
                for (let i in materialJson) {
                    console.log("i: ", i);
                    this._materialCache[materialJson[i].uuid] = materialJson[i];
                    let downloadUrl = makeDownloadUrl(materialJson[i]);
                    data.push(downloadUrl);
                }

                res.status(201);
                res.end(JSON.stringify({ ok: true, type: "url", data: data }));
            } else {
                this._materialCache[materialJson.uuid] = materialJson;
                let downloadUrl = makeDownloadUrl(materialJson);
    
                res.status(201);
                res.end(JSON.stringify({ ok: true, type: "url", data: [ downloadUrl ] }));
            }
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