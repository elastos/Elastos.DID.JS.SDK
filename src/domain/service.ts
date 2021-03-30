import { JSONObject } from 'jsonobject'

export class Service extends JSONObject  {
    public readonly id: string;
    public readonly type: string;
    public readonly serviceEndpoint: string;

    public constructor (id: string, type: string, endpoint: string) {
        super();
        this.id = id;
        this.type = type;
        this.serviceEndpoint = endpoint;
    }
}
