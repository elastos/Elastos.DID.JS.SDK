import { encode as encodeBase58, decode as decodeBase58 } from "bs58check";

export class Base58 {
    public static decode(base58: string): Buffer {
        return decodeBase58(base58);
    }

    public static encode(data: Buffer): string {
        return encodeBase58(data);
    }
}