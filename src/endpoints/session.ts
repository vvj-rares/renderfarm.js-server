import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, ISettings, ISessionService, IDatabase } from "../interfaces";
import { TYPES } from "../types";
import { Session } from "../database/model/session";

@injectable()
class SessionEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _sessionService: ISessionService;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.ISessionService) sessionService: ISessionService,
    ) {

        this._settings = settings;
        this._sessionService = sessionService;
        this._database = database;
    }

    async validateApiKey(res: any, apiKey: string) {
        try {
            await this._database.getApiKey(apiKey);
            return true;
        } catch (err) {
            console.log(`REJECT | api_key rejected`);
            res.status(403);
            res.end(JSON.stringify({ ok: false, message: "api_key rejected", error: err.message }, null, 2));
            return false;
        }
    }

    async validateWorkspaceGuid(res: any, apiKey: string, workspaceGuid: string)
    {
        try {
            let workspace = await this._database.getWorkspace(workspaceGuid);

            if (workspace.apiKey !== apiKey) {
                console.log(`REJECT | workspace_guid does not belong to provided api_key`);
                res.status(403);
                res.end(JSON.stringify({ ok: false, message: "workspace_guid does not belong to provided api_key", error: null }, null, 2));
                return false;
            }

            return true;

        } catch (err) {
            console.log(`REJECT | workspace_guid rejected`);
            res.status(403);
            res.end(JSON.stringify({ ok: false, message: "workspace_guid rejected", error: err.message }, null, 2));
            return false;
        }
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/session/:uid`, async function (this: SessionEndpoint, req, res) {
            let sessionGuid = req.params.uid;
            console.log(`GET on ${req.path}`);

            let session: Session;
            try {
                session = await this._sessionService.GetSession(sessionGuid, true, false);
                if (!session) {
                    console.log(`  FAIL | session not found: ${sessionGuid}`);
                    res.status(404);
                    res.end(JSON.stringify({ ok: false, message: "session not found", error: null }, null, 2));
                    return;
                }
            } catch (err) {
                console.log(`  FAIL | failed to get session: ${sessionGuid}`);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get session", error: err.message }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "session", data: session.toJSON() }, null, 2));

        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/session`, async function (this: SessionEndpoint, req, res) {
            let apiKey = req.body.api_key;
            let workspaceGuid = req.body.workspace_guid;
            let sceneFilename = req.body.scene_filename;

            console.log(`POST on ${req.path} with api_key: ${apiKey} with workspace: ${workspaceGuid}`);

            if (!apiKey) {
                console.log(`REJECT | api_key is missing`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "api_key is missing", error: null }, null, 2));
                return;
            }

            if (!workspaceGuid) {
                console.log(`REJECT | workspace_guid is missing`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "workspace_guid is missing", error: null }, null, 2));
                return;
            }

            if (!await this.validateApiKey(res, apiKey)) return;

            if (!await this.validateWorkspaceGuid(res, apiKey, workspaceGuid)) return;

            let session: Session;
            try {
                session = await this._sessionService.CreateSession(apiKey, workspaceGuid, sceneFilename);
            } catch (err) {
                console.log(`  FAIL | failed to create session, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to create session", error: err.message }, null, 2));
                return;
            }

            res.status(201);
            res.end(JSON.stringify({ ok: true, type: "session", data: { guid: session.guid } }, null, 2));

        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/session/:uid`, async function (this: SessionEndpoint, req, res) {
            console.log(`DELETE on ${req.path}`);

            let sessionGuid = req.params.uid;

            let closedSession: Session;
            try {
                closedSession = await this._sessionService.CloseSession(sessionGuid);
            } catch (err) {
                console.log(`  FAIL | failed to close session, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to close session", error: err.message }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify({ 
                ok: true, 
                type: "session", 
                data: closedSession.toJSON() }, null, 2));

        }.bind(this));
    }
}

export { SessionEndpoint };