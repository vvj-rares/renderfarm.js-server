import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IFactory, IMaxscriptClient } from "../../interfaces";
import { TYPES } from "../../types";
import { isArray } from "util";

const LZString = require("lz-string");

@injectable()
class ThreeGeometryEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IFactory<IMaxscriptClient>;

    // private _geometriesJson: { [sessionGuid: string] : any; } = {};
    private _geometryCache: any = {};

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IFactory<IMaxscriptClient>) 
    {
        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/geometry/:uuid`, async function (this: ThreeGeometryEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve geometry ${uuid}`);

            let geometryJson = this._geometryCache[uuid];
            if (!geometryJson) {
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "geometry not found", error: null }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify(geometryJson));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three/geometry`, async function (this: ThreeGeometryEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            let compressedJson = req.body.compressed_json;
            if (!compressedJson) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing compressed_json", error: null }, null, 2));
                return;
            }

            let geometryJsonText = LZString.decompressFromBase64(compressedJson);
            let geometryJson: any = JSON.parse(geometryJsonText);

            let makeDownloadUrl = function(this: ThreeGeometryEndpoint, geometryJson: any) {
                return `https://${this._settings.current.host}:${this._settings.current.port}/v${this._settings.majorVersion}/three/geometry/${geometryJson.uuid}`;
            }.bind(this);

            if (isArray(geometryJson)) {
                let data = [];
                for (let i in geometryJson) {
                    console.log("i: ", i);
                    this._geometryCache[geometryJson[i].uuid] = geometryJson[i];
                    let downloadUrl = makeDownloadUrl(geometryJson[i]);
                    data.push(downloadUrl);
                }

                res.status(201);
                res.end(JSON.stringify({ ok: true, type: "url", data: data }));
            } else {
                this._geometryCache[geometryJson.uuid] = geometryJson;
                let downloadUrl = makeDownloadUrl(geometryJson);
    
                res.status(201);
                res.end(JSON.stringify({ ok: true, type: "url", data: [ downloadUrl ] }));
            }
        }.bind(this));

        express.put(`/v${this._settings.majorVersion}/three/geometry/:uuid`, async function (this: ThreeGeometryEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`PUT on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // accept updated geometry ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/three/geometry/:uuid`, async function (this: ThreeGeometryEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`DELETE on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // delete geometry ${uuid}`);

            res.status(200);
            res.end(JSON.stringify({}));
        }.bind(this));
    }
}

export { ThreeGeometryEndpoint };