import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IFactory, IMaxscriptClient, IGeometryCache, ISessionPool, ISessionService, IGeometryBinding } from "../../interfaces";
import { TYPES } from "../../types";
import { isArray } from "util";
import { Session } from "../../database/model/session";

const LZString = require("lz-string");

@injectable()
class ThreeGeometryEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _sessionService: ISessionService;
    private _geometryBindingFactory: IFactory<IGeometryBinding>;
    private _geometryCachePool: ISessionPool<IGeometryCache>;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.ISessionService) sessionService: ISessionService,
                @inject(TYPES.IGeometryBindingFactory) geometryBindingFactory: IFactory<IGeometryBinding>,
                @inject(TYPES.IGeometryCachePool) geometryCachePool: ISessionPool<IGeometryCache>,
    ) {
        this._settings = settings;
        this._sessionService = sessionService;
        this._geometryBindingFactory = geometryBindingFactory;
        this._geometryCachePool = geometryCachePool;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/three/geometry/:uuid`, async function (this: ThreeGeometryEndpoint, req, res) {
            let sessionGuid = req.body.session;
            console.log(`GET on ${req.path} with session: ${sessionGuid}`);

            let uuid = req.params.uuid;
            console.log(`todo: // retrieve geometry ${uuid}`);

            let geometryCache = this._geometryCachePool.FindOne(obj => {
                return Object.keys(obj.Geometries).indexOf(uuid) !== -1;
            });

            if (!geometryCache) {
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "geometry cache not found", error: null }, null, 2));
                return;
            }

            let geometryBinding = geometryCache.Geometries[uuid];
            if (!geometryBinding) {
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "geometry not found", error: null }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify(geometryBinding.ThreeJson));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/three/geometry`, async function (this: ThreeGeometryEndpoint, req, res) {
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

            let geometryJsonText = LZString.decompressFromBase64(compressedJson);
            let geometryJson: any = JSON.parse(geometryJsonText);

            let generateUv2 = req.body.generate_uv2;
            // todo: handle uv2 generation

            let makeDownloadUrl = function(this: ThreeGeometryEndpoint, geometryJson: any) {
                return `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/three/geometry/${geometryJson.uuid}`;
            }.bind(this);

            let geometryCache = await this._geometryCachePool.Get(session);

            if (isArray(geometryJson)) {
                let data = [];
                for (let i in geometryJson) {
                    let newGeomBinding = await this._geometryBindingFactory.Create(session, geometryJson[i]);
                    geometryCache.Geometries[geometryJson[i].uuid] = newGeomBinding;
                    // await newGeomBinding.Post(geometryJson, null);
                    let downloadUrl = makeDownloadUrl(geometryJson[i]);
                    data.push(downloadUrl);
                }

                res.status(201);
                res.end(JSON.stringify({ ok: true, type: "url", data: data }));
            } else {
                let newGeomBinding = await this._geometryBindingFactory.Create(session, geometryJson);
                geometryCache.Geometries[geometryJson.uuid] = newGeomBinding;
                // await newGeomBinding.Post(geometryJson, null);
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