export class KeyPair {
    private privateKey: any;
    private publicKey: any;

    public constructor (publicKey: any, privateKey: any) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    public getPublic(): any {
        return this.publicKey;
    }

    public getPrivate(): any {
        return this.privateKey;
    }
}