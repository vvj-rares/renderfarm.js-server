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
            this._client.write(`resetMaxFile #noPrompt`);
        }.bind(this));
    }

    createScene(sceneName): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("create scene returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("create scene error: ", err);
                reject(err);
            };

            // now run command
            this._client.write(`resetMaxFile #noPrompt; Dummy name:"${sceneName}"`);
        }.bind(this));
    }

    setObjectWorldMatrix(nodeName, matrixWorldArray): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("set object world matrix returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("set object world matrix error: ", err);
                reject(err);
            };

            let m = matrixWorldArray;
            let maxscript = `in coordsys world $${nodeName}.transform = (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}])`;

            this._client.write(maxscript);
        }.bind(this));
    }

    linkToParent(nodeName: string, parentName: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("link to parent returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("link to parent error: ", err);
                reject(err);
            };

            let maxscript = `$${nodeName}.parent = $${parentName}`;

            this._client.write(maxscript);
        }.bind(this));
    }

    renameObject(nodeName: string, newName: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("rename object returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("rename object error: ", err);
                reject(err);
            };

            let maxscript = `$${nodeName}.name = "${newName}"`;

            this._client.write(maxscript);
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
                          + `cam.transform = (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}])`;

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

    cloneInstance(nodeName: string, cloneName: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("instance clone returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("instance clone error: ", err);
                reject(err);
            };

            let maxscript = `instance $${nodeName} name:"${cloneName}" transform: (matrix3 [1,0,0] [0,1,0] [0,0,1] [0,0,0])`;
            this._client.write(maxscript);
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

    createSpotlight(spotlightJson: any): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("create spotlight returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            };

            this._errorHandler = function(err) {
                console.error("create spotlight error: ", err);
                reject(err);
            };

            let m = spotlightJson.matrix;
            let r = (spotlightJson.color >> 16) & 0xFF;
            let g = (spotlightJson.color >> 8)  & 0xFF;
            let b = (spotlightJson.color)       & 0xFF;

            let hotspot = 180.0 / (Math.PI / spotlightJson.angle);
            let falloff = hotspot + 5;

            let t = spotlightJson.target;

            let maxscript = `aTargetSpot = TargetSpot name: "${spotlightJson.name}" `
                          + ` transform: (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}]) `
                          + ` multiplier: ${spotlightJson.intensity} `
                          + ` rgb: (color ${r} ${g} ${b}) `
                          + ` hotspot: ${hotspot} `
                          + ` falloff: ${falloff} `
                          + ` target: (Targetobject transform: (matrix3 [${t[0]},${t[1]},${t[2]}] [${t[4]},${t[5]},${t[6]}] [${t[8]},${t[9]},${t[10]}] [${t[12]},${t[13]},${t[14]}])); `
                          + ` aTargetSpot.shadowGenerator = shadowMap(); aTargetSpot.baseObject.castShadows = true; `;
            if (spotlightJson.shadow && spotlightJson.shadow.mapsize > 0) {
                maxscript += ` aTargetSpot.mapSize = ${spotlightJson.shadow.mapsize}; `;
            }

            this._client.write(maxscript);
        }.bind(this));
    }

    createMaterial(materialJson: any): Promise<boolean> {

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

            let diffuse = {
                r: (materialJson.color >> 16) & 0xFF,
                g: (materialJson.color >> 8)  & 0xFF,
                b: (materialJson.color)       & 0xFF
            };

            let specular = {
                r: (materialJson.specular >> 16) & 0xFF,
                g: (materialJson.specular >> 8)  & 0xFF,
                b: (materialJson.specular)       & 0xFF
            };

            let emissive = {
                r: (materialJson.emissive >> 16) & 0xFF,
                g: (materialJson.emissive >> 8)  & 0xFF,
                b: (materialJson.emissive)       & 0xFF
            };

            // now run command
            let maxscript = `StandardMaterial name:"${materialJson.name}" ` 
                          + ` diffuse: (color ${diffuse.r}  ${diffuse.g}  ${diffuse.b}) `
                          + ` specular:(color ${specular.r} ${specular.g} ${specular.b}) `
                          + ` emissive:(color ${emissive.r} ${emissive.g} ${emissive.b}) `
                          + ` opacity: ${materialJson.opacity !== undefined ? 100 * materialJson.opacity : 100} `
                          + ` glossiness: ${materialJson.shininess !== undefined ? materialJson.shininess : 30} `
                          + ` specularLevel: 75 `
                          + ` shaderType: 5 `; // for Phong

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
            let maxscript = `threejsImportBufferGeometry \"${path}\" \"${nodeName}\"`;
            this._client.write(maxscript);
        }.bind(this));
    }

    assignMaterial(nodeName: string, materialName: string): Promise<boolean> {

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
