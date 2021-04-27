import * as bs58check from 'bs58'

export class Base58 {
    public static decode(base58: string): Buffer {
        return bs58check.decode(base58);
    }

    public static encode(data: Buffer): string {
        return bs58check.encode(data);
    }
}