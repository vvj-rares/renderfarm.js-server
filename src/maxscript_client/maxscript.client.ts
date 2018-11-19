import { injectable, inject } from "inversify";
import { IMaxscriptClient } from "../interfaces";
import { Socket } from "net";

@injectable()
class MaxscriptClient implements IMaxscriptClient {

    private _responseHandler:        (data: any) => boolean;
    private _errorHandler:           (err: any) => void;
    private _client: Socket;

    constructor() {
    }

    connect(ip: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {

            this._client = new Socket();
            this._client.on('data', function(data) {
                console.log(data.toString());
                if (this._responseHandler) {
                    this._responseHandler(data);
                }
            }.bind(this));
            this._client.on('error', function(err) {
                console.error(err);
                if (this._errorHandler) {
                    this._errorHandler(err);
                }
                reject(err)
            }.bind(this));

            this._client.on('close', function() {
                console.log(`Client disconnected from maxscript endpoint: ${ip}`);
            }.bind(this));

            // now connect and test a connection with some simple command
            this._client.connect(29207, ip, function() {
                console.log(`Client connected to remote maxscript endpoint: ${ip}`);
                resolve(true);
            }.bind(this));

        }.bind(this));
    }

    disconnect() {
        this._client.destroy();
    }

    resetScene(): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("reset scene returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("reset scene error: ", err);
                reject(err);
            };

            // now run command
            this._client.write("resetMaxFile #noPrompt");
        }.bind(this));
    }

    createTargetCamera(cameraJson: any): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("create camera returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("create camera error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `Targetcamera fov:${cameraJson.fov} nearclip:1 farclip:1000 nearrange:0 farrange:1000 ` 
                          + ` mpassEnabled:off mpassRenderPerPass:off ` 
                          + ` pos:[${cameraJson.position[0]},${cameraJson.position[2]},${cameraJson.position[1]}] `
                          + ` isSelected:on name:"${cameraJson.name}" ` 
                          + ` target:(Targetobject transform:(matrix3 [1,0,0] [0,1,0] [0,0,1] [${cameraJson.target[0]},${cameraJson.target[2]},${cameraJson.target[1]}]))`;

            this._client.write(maxscript);
        }.bind(this));
    }

    createSkylight(skylightJson: any): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("create skylight returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("create skylight error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `aSkylight = Skylight pos:[${skylightJson.position[0]},${skylightJson.position[2]},${skylightJson.position[1]}] `
                          + `isSelected:off; aSkylight.cast_Shadows = on; aSkylight.rays_per_sample = 15;`;

            this._client.write(maxscript);
        }.bind(this));
    }

    downloadJson(url: string, path: string): Promise<boolean> {
        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("download json returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("download json  error: ", err);
                reject(err);
            };

            // now run command
            const curlPath = "C:\\\\bin\\\\curl";
            let maxscript = `cmdexRun "${curlPath} -k -s -H \\\"Accept: application/json\\\" \\\"${url}\\\" -o \\\"${path}\\\" "`;

            this._client.write(maxscript);
        }.bind(this));
    }

    importMesh(path: string, nodeName: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("download json returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("download json  error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `threejsImportJson \"${path}\" \"${nodeName}\"`;

            this._client.write(maxscript);
        }.bind(this));
    }

    renderScene(camera: string, size: number[], filename: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("renderScene returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("renderScene error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `render camera:$${camera} outputSize: [${size[0]},${size[1]}] ` 
                          + `outputfile: "${filename}" vfb: false`;

            console.log(" >> " + maxscript);

            this._client.write(maxscript);
        }.bind(this));
    }

    uploadPng(path: string, url: string): Promise<boolean> {
        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("download json returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("download json  error: ", err);
                reject(err);
            };

            // now run command
            const curlPath = "C:\\\\bin\\\\curl";
            let maxscript = `cmdexRun "${curlPath} -k -F \\\"somefile=@${path}\\\" \\\"${url}\\\" "`;

            this._client.write(maxscript);
        }.bind(this));
    }
}

export { MaxscriptClient };
