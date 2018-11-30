import { injectable } from "inversify";
import { IDatabase, IChecks } from "../interfaces";

const settings = require("../settings");

@injectable()
class Checks implements IChecks {

    constructor() {
    }

    public async checkApiKey(res: any, database: IDatabase, apiKey: string): Promise<boolean> {

        if (!settings.apiKeyCheck) {
            return new Promise<boolean>(function(resolve, reject) {
                resolve(true);
            });
        } else {
            let apiKeyInfo = database.getApiKey(apiKey);
            if (apiKeyInfo) {
                console.log(`    OK | api_key ${apiKey} accepted`);
                return true;
            } else {
                console.log(`  FAIL | api_key ${apiKey} declined`);
                res.status(403);
                res.end(JSON.stringify({ error: "api_key declined" }, null, 2));
                return false;
            }
        }

    }

    public async checkWorkspace(res: any, database: IDatabase, apiKey: string, workspaceGuid: string): Promise<boolean> {

        if (!settings.workspaceCheck) {
            return new Promise<boolean>(function(resolve, reject) {
                resolve(true);
            });
        } else {
            let workspaceInfo = database.getWorkspace(apiKey, workspaceGuid);
            if (workspaceInfo) {
                console.log(`    OK | workspace ${workspaceGuid} found`);
                return true;
            } else {
                console.log(`  FAIL | workspace ${workspaceGuid} not found`);
                res.status(403);
                res.end(JSON.stringify({ error: "workspace not found" }, null, 2));
                return false;
            }
        }

    }

}

export { Checks };