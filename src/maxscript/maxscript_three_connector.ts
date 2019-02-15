import { IMaxscriptThreeConnector, IMaxscriptClient, IFactory } from "../interfaces";

export class MaxscriptThreeConnector implements IMaxscriptThreeConnector {
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