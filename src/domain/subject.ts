import { JSONObject } from 'jsonobject'

export class Subject extends JSONObject  {
    public readonly id: Did;
    public appDid?: string;
    public appInstanceDid?: Did;
    public name?: string;
    public value?: any;

    public constructor (id: Did) {
        super();
        this.id = id;
    }
}