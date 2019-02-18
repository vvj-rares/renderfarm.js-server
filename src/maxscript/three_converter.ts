import { IMaxscriptClient, IThreeConverter } from "../interfaces";

// translates three json objects and changes to maxscript commands,
// to keep scene up to date with latest changes in three.js scene.
export class ThreeConverter implements IThreeConverter {
    private _maxscript: IMaxscriptClient;

    private _sceneJson: any;

    constructor(
        maxscript: IMaxscriptClient,
    ) {
        this._maxscript = maxscript;
    }

    public async PostScene(sceneJson: any): Promise<any> {
        this._sceneJson = sceneJson;

        let obj = sceneJson.object;

        return true;
    }
}