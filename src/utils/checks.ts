import { injectable } from "inversify";
import { IDatabase, IChecks } from "../interfaces";

const settings = require("../settings");

@injectable()
class Checks implements IChecks {

    public async checkApiKey(res: any, database: IDatabase, apiKey: string): Promise<boolean> {

        if (!settings.apiKeyCheck) {
            return new Promise<boolean>(function(resolve, reject) {
                resolve(true);
            });
        } else {
            let apiKeyRec = await database.getApiKey(apiKey);
            if (apiKeyRec.value) {
                console.log(`    OK | api_key ${apiKey} accepted`);
                return true;
            } else {
                console.log(`  FAIL | api_key ${apiKey} declined`);
                res.status(403);
                res.send(JSON.stringify({ error: "api_key declined" }, null, 2));
                return false;
            }
        }

    }

}

export { Checks };