import { PublicKey, PrivateKey } from "bitcore-lib";

export class KeyPair {
    private privateKey: PrivateKey;
    private publicKey: PublicKey;

    public constructor (publicKey: PublicKey, privateKey: PrivateKey) {
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