import { injectable } from "inversify";
import { ISceneObjectBinding } from "../../interfaces";

@injectable()
export class SceneBinding implements ISceneObjectBinding {
    public async PostObject(objectJson: any): Promise<string> {
        return JSON.stringify(objectJson);
    }
}
