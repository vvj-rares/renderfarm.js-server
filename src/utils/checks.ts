import { injectable } from "inversify";
import { IDatabase, IChecks } from "../interfaces";

const settings = require("../settings");

@injectable()
class Checks implements IChecks {

    constructor() {
    }

    public async checkApiKey(res: any, database: IDatabase, apiKey: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {

            if (!settings.apiKeyCheck) {
                resolve(true);
            } else {
                database.getApiKey(apiKey)
                    .then(function(apiKeyInfo) {
                        if (apiKeyInfo.value) {
                            console.log(" >> ", apiKeyInfo.value);
                            console.log(`    OK | api_key ${apiKey} accepted`);
                            resolve(apiKeyInfo);
                        } else {
                            console.log(`  FAIL | api_key ${apiKey} declined`);
                            res.status(403);
                            res.end(JSON.stringify({ error: "api_key declined" }, null, 2));
                            reject(false);
                        }
                    })
                    .catch(function(err) {
                        console.log(`  FAIL | api_key ${apiKey} declined`);
                        res.status(500);
                        res.end(JSON.stringify({ error: "api_key declined" }, null, 2));
                        reject(false);
                    });
            }

        });
    }

    async checkApiKeySync(res: any, database: IDatabase, apiKey: string): Promise<boolean> {
        try {
            return await this.checkApiKey(res, database, apiKey);
        } catch (exc) {
            return false;
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