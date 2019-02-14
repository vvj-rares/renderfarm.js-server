import { IMaxscriptThreeConnector, IMaxscriptClient, IFactory } from "../interfaces";

export class MaxscriptThreeConnector implements IMaxscriptThreeConnector {
    private _maxscript: IMaxscriptClient;

    constructor(
        maxscript: IMaxscriptClient,
    ) {
        this._maxscript = maxscript;
    }

    public async PostScene(sceneJson: any): Promise<any> {
        return true;
    }
}