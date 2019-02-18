import { Session } from "../database/model/session";
import { IDatabase } from "../interfaces";

export class EndpointHelpers {
    public static async tryGetSession(sessionGuid: string, database: IDatabase, res: any) {
        let session: Session;
        try {
            session = await database.getSession(sessionGuid, { allowClosed: true, readOnly: true, resolveRefs: true });
            if (!session) {
                console.log(`  FAIL | session not found: ${sessionGuid}`);
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "session not found", error: null }, null, 2));
                return undefined;
            }
        } catch (err) {
            console.log(`  FAIL | failed to get session: ${sessionGuid}`);
            res.status(500);
            res.end(JSON.stringify({ ok: false, message: "failed to get session", error: err.message }, null, 2));
            return undefined;
        }
        return session;
    }
}