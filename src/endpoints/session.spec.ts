import "reflect-metadata";
import { IEndpoint, ISettings } from "../interfaces";
import { SessionEndpoint } from "./session";
import { Settings } from "../settings";
import { Workspace } from "../database/model/workspace";

require("../jasmine.config")();

describe("SessionEndpoint", function() {
    var session: IEndpoint;
    var settings: ISettings;
    var database: any;
    var express: any;
    var maxscriptClientFactory: any;
    var maxscriptClient: any;

    beforeEach(function() {

        settings = new Settings("test");
        database = jasmine.createSpyObj("database", ["getApiKey", "getWorkspace", "startWorkerSession", "assignSessionWorkspace"]);
        express = jasmine.createSpyObj("express", ["post", "delete"]);
        maxscriptClientFactory = jasmine.createSpyObj("maxscriptClientFactory", ["create"]);
        maxscriptClient = jasmine.createSpyObj("maxscriptClient", ["connect", "setSession", "setWorkspace", "disconnect"]);
        session = new SessionEndpoint(settings, database, maxscriptClientFactory);
    })

    it("should handle POST", async function() {
        let postHandler = {};
        let expressPostMock = function(path, handler) {
            postHandler[path] = handler;
        };
        express.post.and.callFake(expressPostMock);
        session.bind(express);

        expect(postHandler["/v1/session"]).toBeDefined();

        let req = {
            body: {
                api_key: "someApiKey",
                workspace: "someWorkspaceGuid"
            }
        };

        let res = jasmine.createSpyObj("res", ["status", "end"]);

        let getApiKeyMock = async function(value) {
            expect(value).toBe("someApiKey");
            return value;
        };
        database.getApiKey.and.callFake(getApiKeyMock);

        let getWorkspaceMock = async function(value) {
            expect(value).toBe("someWorkspaceGuid");
            return new Promise<Workspace>(function(resolve, reject) { 
                resolve(new Workspace({ guid: value }));
            });
        };
        database.getWorkspace.and.callFake(getWorkspaceMock);

        let generatedSessionGuid: string;
        let assignSessionWorkspaceMock = function(sessionGuid, workspaceGuid) {
            expect(workspaceGuid).toBe("someWorkspaceGuid");
            expect(sessionGuid).toBe(generatedSessionGuid);
            
            return new Promise<boolean>(function(resolve, reject) { 
                resolve(true);
            });
        };
        database.assignSessionWorkspace.and.callFake(assignSessionWorkspaceMock);

        let startWorkerSessionMock = function(apiKey, newSessionGuid) {
            expect(apiKey).toBe("someApiKey");
            expect(newSessionGuid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

            generatedSessionGuid = newSessionGuid;

            return new Promise<any>(function(resolve, reject) { 
                resolve({
                    session: { guid: newSessionGuid },
                    worker: { mac: "someMacAddress", ip: "1.2.3.4", port: 1234 }
                });
            });
        };
        database.startWorkerSession.and.callFake(startWorkerSessionMock);

        let maxscriptFactoryCreateMock = function() {
            return maxscriptClient;
        };
        maxscriptClientFactory.create.and.callFake(maxscriptFactoryCreateMock);

        let maxscriptClientConnectMock = function(ip, port) {
            return new Promise<boolean>(function(resolve, reject) { 
                resolve(true);
            });
        };
        maxscriptClient.connect.and.callFake(maxscriptClientConnectMock);

        let maxscriptClientSetSessionMock = function(value) {
            expect(value).toBe(generatedSessionGuid);
            return new Promise<boolean>(function(resolve, reject) { 
                resolve(true);
            });
        };
        maxscriptClient.setSession.and.callFake(maxscriptClientSetSessionMock);

        let maxscriptClientSetWorkspaceMock = function(workspaceInfo) {
            expect(workspaceInfo.guid).toBe("someWorkspaceGuid");
            return new Promise<boolean>(function(resolve, reject) { 
                resolve(true);
            });
        };
        maxscriptClient.setWorkspace.and.callFake(maxscriptClientSetWorkspaceMock);

        let maxscriptClientDisconnectMock = function() {
            return new Promise<boolean>(function(resolve, reject) { 
                resolve(true);
            });
        };
        maxscriptClient.disconnect.and.callFake(maxscriptClientDisconnectMock);

        await postHandler["/v1/session"](req, res);

        //todo: test also res status code and response
    }.bind({ }));
});
