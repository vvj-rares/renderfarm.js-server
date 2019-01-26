import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../../interfaces";
import { TYPES } from "../../types";

@injectable()
class SceneEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) 
    {
        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.post(`/v${this._settings.majorVersion}/scene`, async function (req, res) {
            console.log(`POST on /scene with session: ${req.body.session}`);

            let sessionGuid = req.body.session;

            this._database.getWorker(sessionGuid)
                .then(function(worker){

                    this._database.getSessionWorkspace(sessionGuid)
                        .then(function(workspaceInfo){
                            console.log(`    OK | retrieved workspace by session`);

                            let maxscriptClient = this._maxscriptClientFactory.create();
                            maxscriptClient.connect(worker.ip, worker.port)
                                .then(function(value) {
                                    console.log("SceneEndpoint connected to maxscript client, ", value);

                                    let sceneName = require('../utils/genRandomName')("scene");

                                    let maxSceneFilename = req.body.scene_filename;

                                    if (maxSceneFilename) {

                                        maxscriptClient.openScene(sceneName, maxSceneFilename, workspaceInfo)
                                            .then(function(value) {
                                                maxscriptClient.disconnect();
                                                console.log(`    OK | scene open: ${maxSceneFilename}, `, value);
                                                res.end(JSON.stringify({ id: sceneName }, null, 2));
                                            }.bind(this))
                                            .catch(function(err) {
                                                maxscriptClient.disconnect();
                                                console.error(`  FAIL | failed to open scene\n`, err);
                                                res.status(500);
                                                res.end(JSON.stringify({ error: "failed to open scene" }, null, 2));
                                            }.bind(this));
                                    } else {
                                        maxscriptClient.createScene(sceneName)
                                            .then(function(value) {
                                                maxscriptClient.disconnect();
                                                console.log(`    OK | scene reset`);
                                                res.end(JSON.stringify({ id: sceneName }, null, 2));
                                            }.bind(this))
                                            .catch(function(err) {
                                                maxscriptClient.disconnect();
                                                console.error(`  FAIL | failed to reset scene\n`, err);
                                                res.status(500);
                                                res.end(JSON.stringify({ error: "failed to reset scene" }, null, 2));
                                            }.bind(this));
                                    }

                                }.bind(this))
                                .catch(function(err) {
                                    console.error("SceneEndpoint failed to connect to maxscript client, ", err);
                                }.bind(this)); // end of maxscriptClient.connect promise

                        }.bind(this))
                        .catch(function(err){
                            console.error(`  FAIL | failed to retrieve workspace by session\n`, err);
                            res.status(500);
                            res.end(JSON.stringify({ error: "failed to retrieve workspace by session" }, null, 2));
                        }.bind(this)); // end of getSessionWorkspace promise

                }.bind(this))
                .catch(function(err){
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise
    
        }.bind(this));

        express.put(`/v${this._settings.majorVersion}/scene/:uid`, async function (req, res) {
            console.log(`PUT on /scene/${req.params.uid}`);
            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/scene/:uid`, async function (req, res) {
            console.log(`DELETE on /scene/${req.params.uid}`);
            res.end(JSON.stringify({}, null, 2));
        }.bind(this));
    }
}

export { SceneEndpoint };