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

    setSession(sessionGuid: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                let response = data.toString();
                console.log("session set returned: ", response);
                this._responseHandler = undefined;

                if (response.indexOf("worker_busy") !== -1) {
                    resolve(false);
                }

                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("session set error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `SessionGuid = "${sessionGuid}"; resetMaxFile #noPrompt`;

            this._client.write(maxscript);
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

            let m = cameraJson.matrix;
            // now run command
            let maxscript = `cam = FreeCamera fov:${cameraJson.fov} nearclip:1 farclip:1000 nearrange:0 farrange:1000 ` 
                          + ` mpassEnabled:off mpassRenderPerPass:off ` 
                          + ` isSelected:on name:"${cameraJson.name}"; ` 
                          + `cam.transform = (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}]) * (matrix3 [1,0,0] [0,0,1] [0,1,0] [0,0,0])`;

            console.log(" >> maxscript: ", maxscript);
            console.log(" >> camera matrix: ", cameraJson.matrix);

            this._client.write(maxscript);
        }.bind(this));
    }

    updateTargetCamera(cameraJson: any): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("update camera returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("update camera error: ", err);
                reject(err);
            };

            let maxscript = "";
            if (cameraJson.fov !== undefined)      
                maxscript = maxscript + ` $${cameraJson.name}.fov = ${cameraJson.fov}; `;

            if (cameraJson.position !== undefined) 
                maxscript = maxscript + ` $${cameraJson.name}.pos = [${cameraJson.position[0]},${cameraJson.position[2]},${cameraJson.position[1]}]; `;

            if (cameraJson.target !== undefined)   
                maxscript = maxscript + ` $${cameraJson.name}.target.pos = [${cameraJson.target[0]},${cameraJson.target[2]},${cameraJson.target[1]}]; `;

            if (maxscript !== "") {
                this._client.write(maxscript);
            } else {
                resolve(true); // no changes, just resolve the promise
            }
        }.bind(this));
    }

    deleteObjects(mask: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("delete objects returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("delete objects error: ", err);
                reject(err);
            };

            let maxscript = `delete $${mask};`;
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
            let maxscript = `aSkylight = Skylight name:"${skylightJson.name}" pos:[${skylightJson.position[0]},${skylightJson.position[2]},${skylightJson.position[1]}] `
                          + `isSelected:off; aSkylight.cast_Shadows = on; aSkylight.rays_per_sample = 15;`;

            this._client.write(maxscript);
        }.bind(this));
    }

    createStandardMaterial(materialJson: any): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("create default material returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("create default material error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `StandardMaterial name:"${materialJson.name}" diffuse:(color ${materialJson.diffuseColor[0]} ${materialJson.diffuseColor[1]} ${materialJson.diffuseColor[2]})`;

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

    importMesh(path: string, nodeName: string, matrix: number[]): Promise<boolean> {

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

            let m = matrix;

            // now run command
            let maxscript = `threejsImportJson \"${path}\" \"${nodeName}\"; ` 
                          + ` $${nodeName}.transform = (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}]) * (matrix3 [1,0,0] [0,0,1] [0,1,0] [0,0,0])`;

            this._client.write(maxscript);
        }.bind(this));
    }

    assignMaterial(materialName: string, nodeName: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("assign material returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("assign material error: ", err);
                reject(err);
            };

            // now run command
            let maxscript = `mat = rayysFindMaterialByName "${materialName}"; `
                          + `if (mat != false) then (`
                          + `  $${nodeName}.Material = mat`
                          + `) `;

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
