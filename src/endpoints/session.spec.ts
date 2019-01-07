import "reflect-metadata";
import { IEndpoint } from "../interfaces";
import { SessionEndpoint } from "./session";

describe("SessionEndpoint", function() {
    var session: IEndpoint;
    var database: any;
    var express: any;
    var maxscriptClientFactory: any;

    beforeEach(function() {
        database = jasmine.createSpyObj("database", ["getApiKey", "getWorkspace", "startWorkerSession", "assignSessionWorkspace"]);
        express = jasmine.createSpyObj("express", ["post", "delete"]);
        maxscriptClientFactory = jasmine.createSpyObj("maxscriptClientFactory", ["create"]);
        session = new SessionEndpoint(database, null);
    });

    it("should handle POST", function() {
        let postPath;
        let postHandler;
        let fn = function(path, handler) {
            postHandler = handler;
            postPath = path;
        };
        express.post.and.callFake(fn);
        session.bind(express);

        expect(postPath).toBe("/v1/session");

        let req = {
            body: {
                api_key: "someApiKey",
                workspace: "someWorkspaceGuid"
            }
        };
        let res = jasmine.createSpyObj("res", ["status", "end"]);

        let apiKey;
        let getApiKeyMock = async function(value) {
            apiKey = value;
            return { value: value };
        };
        database.getApiKey.and.callFake(getApiKeyMock);

        let workspaceGuid;
        let getWorkspaceMock = async function(value) {
            workspaceGuid = value;
            return { guid: value };
        };
        database.getWorkspace.and.callFake(getWorkspaceMock)

        let apiKey2, sessionGuid2;
        let startWorkerSessionMock = async function(api_key, session_guid) {
            console.log(">> I'm in 2", api_key, session_guid);
            apiKey2 = api_key;
            sessionGuid2 = session_guid;
            return {
                session: { guid: session_guid },
                worker: { mac: "someMacAddress" }
            };
        };
        database.startWorkerSession.and.callFake(startWorkerSessionMock);

        postHandler(req, res);

        expect(apiKey).toBe("someApiKey");
        expect(workspaceGuid).toBe("someWorkspaceGuid");

        expect(apiKey2).toBe("someApiKey");
        expect(sessionGuid2).toBe("someWorkspaceGuid");
    });
});
