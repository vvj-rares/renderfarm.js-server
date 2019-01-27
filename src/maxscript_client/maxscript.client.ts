import { injectable } from "inversify";
import { IMaxscriptClient } from "../interfaces";
import { Socket } from "net";
import { Workspace } from "../database/model/workspace";

@injectable()
class MaxscriptClient implements IMaxscriptClient {

    private _responseHandler:        (data: any) => boolean;
    private _errorHandler:           (err: any) => void;
    private _client: Socket;

    constructor() {
    }

    connect(ip: string, port: number): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {

            this._client = new Socket();

            this._client.on('data', function(data) {
                if (this._responseHandler) {
                    this._responseHandler(data);
                }
            }.bind(this));

            this._client.on('error', function(err) {
                if (this._errorHandler) {
                    this._errorHandler(err);
                }
                reject(err)
            }.bind(this));

            this._client.on('close', function() {
                // just ok
            }.bind(this));

            // now connect and test a connection with some simple command
            this._client.connect(port, ip, function() {
                resolve(true);
            }.bind(this));

        }.bind(this));
    }

    disconnect() {
        if (this._client) {
            this._client.destroy();
            this._client = null;
        }
    }

    execMaxscript(maxscript: string, actionDesc: string, responseChecker: (resp: string) => boolean = null): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                this._responseHandler = undefined;

                let maxscriptResp = data.toString();
                if (maxscriptResp && maxscriptResp !== "OK") {
                    console.log(`       >> maxscript = ${maxscript}`);
                    console.log(`   LOG | MaxscriptClient.${actionDesc} returned: ${maxscriptResp}` );
                }
                
                if (responseChecker) {
                    if (responseChecker(maxscriptResp)) {
                        resolve();
                    } else {
                        reject(Error(`Unexpected maxscript response: ${maxscriptResp}`));
                    }
                } else {
                    if (maxscriptResp.indexOf("FAIL") === -1) {
                        resolve();
                    } else {
                        reject(Error(`Unexpected maxscript response: ${maxscriptResp}`));
                    }
                }
            };

            this._errorHandler = function(err) {
                console.log ( `      >> maxscript = ${maxscript}`);
                console.error(`  FAIL | MaxscriptClient.${actionDesc} error: `, err);
                reject(err);
            };

            if (maxscript) {
                this._client.write(maxscript);
            } else {
                reject(Error("empty maxscript"));
            }

        }.bind(this));
    }

    resetScene(): Promise<boolean> {
        let maxscript = `resetMaxFile #noPrompt`;
        return this.execMaxscript(maxscript, "resetScene");
    }

    createScene(sceneName): Promise<boolean> {
        let maxscript = `resetMaxFile #noPrompt ; ` 
                        + ` threejsSceneRoot = Dummy name:"${sceneName}" ; `
                        + ` callbacks.removeScripts id:#flipYZ ; `
                        + ` callbacks.removeScripts id:#unflipYZ ; `
                        + ` callbacks.addScript #preRender    "rayysFlipYZ($${sceneName})" id:#flipYZ   persistent:false ; `
                        + ` callbacks.addScript #postRender "rayysUnflipYZ($${sceneName})" id:#unflipYZ persistent:false ; `;

        return this.execMaxscript(maxscript, "createScene");
    }

    openScene(sceneName: string, maxSceneFilename: string, workspace: Workspace): Promise<boolean> {
        let w = workspace;

        let maxscript = `resetMaxFile #noPrompt \r\n`
                        + ` sceneFilename = "${w.homeDir}\\\\api-keys\\\\${w.apiKey}\\\\workspaces\\\\${w.guid}\\\\scenes\\\\${maxSceneFilename}" \r\n`
                        + ` if existFile sceneFilename then ( \r\n`
                        + `     sceneLoaded = loadMaxFile useFileUnits:true quiet:true \r\n`
                        + `     if sceneLoaded then ( \r\n`
                        + `         threejsSceneRoot = Dummy name:"${sceneName}" \r\n`
                        + `         callbacks.removeScripts id:#flipYZ \r\n`
                        + `         callbacks.removeScripts id:#unflipYZ \r\n`
                        + `         callbacks.addScript #preRender    "rayysFlipYZ($${sceneName})" id:#flipYZ   persistent:false \r\n`
                        + `         callbacks.addScript #postRender "rayysUnflipYZ($${sceneName})" id:#unflipYZ persistent:false \r\n`
                        + `     ) else ( \r\n`
                        + `         print "FAIL | failed to load scene" \r\n`
                        + `     ) \r\n`
                        + ` ) else ( \r\n`
                        + `     print "FAIL | scene file not found" \r\n`
                        + ` ) `;

        return this.execMaxscript(maxscript, "openScene");
    }

    setObjectWorldMatrix(nodeName, matrixWorldArray): Promise<boolean> {
        let m = matrixWorldArray;
        let maxscript = `in coordsys world $${nodeName}.transform = (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}])`;
        return this.execMaxscript(maxscript, "setObjectWorldMatrix");
    }

    linkToParent(nodeName: string, parentName: string): Promise<boolean> {
        let maxscript = `$${nodeName}.parent = $${parentName}`;
        return this.execMaxscript(maxscript, "linkToParent");
    }

    renameObject(nodeName: string, newName: string): Promise<boolean> {
        let maxscript = `$${nodeName}.name = "${newName}"`;
        return this.execMaxscript(maxscript, "renameObject");
    }

    setSession(sessionGuid: string): Promise<boolean> {
        let maxscript = `SessionGuid = "${sessionGuid}"`;
        return this.execMaxscript(maxscript, "setSession");
    }

    setWorkspace(workspaceInfo: any): Promise<boolean> {
        let w = workspaceInfo;

        let maxscript = `for i=1 to pathConfig.mapPaths.count() do ( pathConfig.mapPaths.delete 1 )\r\n`
                      + `for i=1 to pathConfig.xrefPaths.count() do ( pathConfig.xrefPaths.delete 1 )\r\n`
                      + `pathConfig.mapPaths.add "${w.homeDir}\\\\api-keys\\\\${w.apiKey}\\\\workspaces\\\\${w.guid}\\\\maps"\r\n`
                      + `pathConfig.xrefPaths.add "${w.homeDir}\\\\api-keys\\\\${w.apiKey}\\\\workspaces\\\\${w.guid}\\\\xrefs"` ;

        return this.execMaxscript(maxscript, "setWorkspace");
    }

    createTargetCamera(cameraJson: any): Promise<boolean> {
        let m = cameraJson.matrix;
        // now run command
        let maxscript = `aFreeCamera = FreeCamera fov:${cameraJson.fov} nearclip:1 farclip:1000 nearrange:0 farrange:1000 ` 
                        + ` mpassEnabled:off mpassRenderPerPass:off ` 
                        + ` isSelected:on name:"${cameraJson.name}" ; ` 
                        + ` aFreeCamera.transform = (matrix3 [${m[0]},${m[1]},${m[2]}] [${m[4]},${m[5]},${m[6]}] [${m[8]},${m[9]},${m[10]}] [${m[12]},${m[13]},${m[14]}]) ; `
                        + ` aFreeCamera.parent = threejsSceneRoot; `;

        console.log(" >> CAMERA: ", maxscript);

        return this.execMaxscript(maxscript, "createTargetCamera");
    }

    updateTargetCamera(cameraJson: any): Promise<boolean> {

        let maxscript = "";
        if (cameraJson.fov !== undefined)      
            maxscript = maxscript + ` $${cameraJson.name}.fov = ${cameraJson.fov}; `;

        if (cameraJson.position !== undefined) 
            maxscript = maxscript + ` $${cameraJson.name}.pos = [${cameraJson.position[0]},${cameraJson.position[2]},${cameraJson.position[1]}]; `;

        if (cameraJson.target !== undefined)   
            maxscript = maxscript + ` $${cameraJson.name}.target.pos = [${cameraJson.target[0]},${cameraJson.target[2]},${cameraJson.target[1]}]; `;

        return this.execMaxscript(maxscript, "updateTargetCamera");
    }

    cloneInstance(nodeName: string, cloneName: string): Promise<boolean> {
        let maxscript = `instance $${nodeName} name:"${cloneName}" transform: (matrix3 [1,0,0] [0,1,0] [0,0,1] [0,0,0])`;
        return this.execMaxscript(maxscript, "cloneInstance");
    }

    deleteObjects(mask: string): Promise<boolean> {
        let maxscript = `delete $${mask}`;
        return this.execMaxscript(maxscript, "deleteObjects");
    }

    createSpotlight(spotlightJson: any): Promise<boolean> {
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
                        + ` aTargetSpot.shadowGenerator = shadowMap(); aTargetSpot.baseObject.castShadows = true; `
                        + ` aTargetSpot.parent = threejsSceneRoot; `
                        + ` aTargetSpot.target.parent = threejsSceneRoot; `;

        if (spotlightJson.shadow && spotlightJson.shadow.mapsize > 0) {
            maxscript += ` aTargetSpot.mapSize = ${spotlightJson.shadow.mapsize}; `;
        }

        return this.execMaxscript(maxscript, "createSkylight");
    }

    createMaterial(materialJson: any): Promise<boolean> {
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

        let maxscript = `StandardMaterial name:"${materialJson.name}" ` 
                        + ` diffuse: (color ${diffuse.r}  ${diffuse.g}  ${diffuse.b}) `
                        + ` specular:(color ${specular.r} ${specular.g} ${specular.b}) `
                        + ` emissive:(color ${emissive.r} ${emissive.g} ${emissive.b}) `
                        + ` opacity: ${materialJson.opacity !== undefined ? 100 * materialJson.opacity : 100} `
                        + ` glossiness: ${materialJson.shininess !== undefined ? materialJson.shininess : 30} `
                        + ` specularLevel: 75 `
                        + ` shaderType: 5 `; // for Phong

        return this.execMaxscript(maxscript, "createMaterial");
    }

    downloadJson(url: string, path: string): Promise<boolean> {
        // console.log(" >> Downloading json from:\n" + url);

        const curlPath = "C:\\\\bin\\\\curl";
        let maxscript = `cmdexRun "${curlPath} -k -s -H \\\"Accept: application/json\\\" \\\"${url}\\\" -o \\\"${path}\\\" "`;

        // console.log(" >> maxscript: " + maxscript);

        return this.execMaxscript(maxscript, "downloadJson");
    }

    importMesh(path: string, nodeName: string): Promise<boolean> {
        let maxscript = `threejsImportBufferGeometry \"${path}\" \"${nodeName}\"`;
        return this.execMaxscript(maxscript, "importMesh");
    }

    assignMaterial(nodeName: string, materialName: string): Promise<boolean> {
        let maxscript = `mat = rayysFindMaterialByName "${materialName}"; `
                        + `if (mat != false) then (`
                        + `  $${nodeName}.Material = mat`
                        + `) `;

        return this.execMaxscript(maxscript, "assignMaterial");
    }

    renderScene(camera: string, size: number[], filename: string, vraySettings: any): Promise<boolean> {

        let maxscript =   ` pngio.settype(#true24) ; `  // enums: {#paletted|#true24|#true48|#gray8|#gray16} 
                        + ` pngio.setAlpha false ; `
                        + ` vr = renderers.current ; `
                        //+ ` vr.progressive_max_render_time = ${vraySettings.progressiveMaxRenderTime} ; `
                        //+ ` vr.progressive_noise_threshold = ${vraySettings.progressiveNoiseThreshold} ; `
                        + ` viewport.setLayout #layout_1 ; `
                        + ` viewport.setCamera $${camera} ; `
                        + ` renderWidth  = ${size[0]} ; `
                        + ` renderHeight = ${size[1]} ; `
                        + ` rendUseActiveView = true ; `
                        + ` rendSaveFile = true ; `
                        + ` rendOutputFilename = "${filename}" ; `
                        + ` max quick render `;

        // see here: http://help.autodesk.com/view/3DSMAX/2018/ENU/?guid=__files_GUID_9175301C_13E6_488B_ABA6_D27CD804B205_htm
        // can also use: JPEG.setQuality(5); JPEG.setSmoothing(1);

        return this.execMaxscript(maxscript, "renderScene");
    }
}

export { MaxscriptClient };
