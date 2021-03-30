import * from "./domain";'

export class VerifiableCredential extends JSONObject {
    public readonly id: string;
    public readonly type: string;
    public readonly issuer: Did;
    public readonly issuanceDate: string;
    public readonly expirationDate: string;
    public readonly credentialSubject: Subject;

    public constructor(id: string, type: string, issuer: Did, issuanceDate: string, expirationDate: string, credentialSubject: Subject) {
        super();
        this.id = id;
        this.type = type;
        this.issuer = issuer;
        this.issuanceDate = issuanceDate;
        this.expirationDate = expirationDate;
        this.credentialSubject = credentialSubject;
    }
}