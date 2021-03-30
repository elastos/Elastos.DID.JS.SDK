import { JSONObject } from 'jsonobject'
import { VerifiableCredential } from 'verifiablecredential'

export class VerifiablePresentation extends JSONObject  {
    public readonly type: string;
    public readonly created: string;
    public readonly verifiableCredential: VerifiableCredential[];

    public constructor (type, created, verifiableCredential) {
        super();
        this.type = type;
        this.created = created;
        this.verifiableCredential = verifiableCredential;
    }
}