import { crypto, PublicKey } from "bitcore-lib";

export class SHA256 {
    public static encodeToString(...inputs: Buffer[]): string {
        let fullInput = inputs.reduce((acc, curr) => Buffer.concat([acc, curr]), Buffer.from(""));
        return crypto.Hash.sha256(fullInput).toString();
    }
}