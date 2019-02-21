import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IFactory, IMaxscriptClient, IMaterialCache, ISessionPool, ISessionService, IMaterialBinding } from "../../interfaces";
import { TYPES } from "../../types";
import { isArray } from "util";
import { Session } from "../../database/model/session";

const LZString = require("lz-string");

@injectable()
class ThreeMaterialEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _sessionService: ISessionService;
    private _materialBindingFactory: IFactory<IMaterialBinding>;
    private _materialCachePool: ISessionPool<IMaterialCache>;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.ISessionService) sessionService: ISessionService,
                @inject(TYPES.IMaterialBindingFactory) materialBindingFactory: IFactory<IMaterialBinding>,
                @inject(TYPES.IMaterialCachePool) materialCachePool: ISessionPool<IMaterialCache>,
    ) {
        this._settings = settings;
        this._sessionService = sessionService;
        this._materialBindingFactory = materialBindingFactory;
        this._materialCachePool = materialCachePool;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/material/:uuid`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve material ${uuid}`);

            let materialCache = this._materialCachePool.FindOne(obj => {
                return Object.keys(obj.Materials).indexOf(uuid) !== -1;
            });

            let materialBinding = materialCache.Materials[uuid];
            if (!materialBinding) {
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "material not found", error: null }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify(materialBinding.ThreeJson));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three/material`, async function (this: ThreeMaterialEndpoint, req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            // check that session is actually open
            let session: Session = await this._sessionService.GetSession(sessionGuid, false, false);
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

            let materialJsonText = LZString.decompressFromBase64(compressedJson);
            let materialJson: any = JSON.parse(materialJsonText);

            let makeDownloadUrl = function(this: ThreeMaterialEndpoint, materialJson: any) {
                return `https://${this._settings.current.host}:${this._settings.current.port}/v${this._settings.majorVersion}/three/material/${materialJson.uuid}`;
            }.bind(this);

            let materialCache = await this._materialCachePool.Get(session);

            if (isArray(materialJson)) {
                let data = [];
                for (let i in materialJson) {
                    let newMaterialBinding = await this._materialBindingFactory.Create(session);
                    materialCache.Materials[materialJson[i].uuid] = newMaterialBinding;
                    let downloadUrl = makeDownloadUrl(materialJson[i]);
                    data.push(downloadUrl);
                }

                res.status(201);
                res.end(JSON.stringify({ ok: true, type: "url", data: data }));
            } else {
                let newMaterialBinding = await this._materialBindingFactory.Create(session);
                materialCache.Materials[materialJson.uuid] = newMaterialBinding;
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