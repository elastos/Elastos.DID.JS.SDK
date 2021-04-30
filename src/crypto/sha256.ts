import createHash  from 'create-hash';
export class SHA256 {

    public static hashTwice(buffer: Buffer): Buffer{
        let firstHash = createHash('sha256').update(buffer).digest();
		return createHash('sha256').update(firstHash).digest()
    }

    public static encodeToString(...inputs: Buffer[]): string {
        let fullInput = inputs.reduce((acc, curr) => Buffer.concat([acc, curr]), Buffer.from(""));
        return crypto.Hash.sha256(fullInput).toString();
    }

    public static encodeToBuffer(...inputs: Buffer[]): Buffer {
        let fullInput = inputs.reduce((acc, curr) => Buffer.concat([acc, curr]), Buffer.from(""));
        return crypto.Hash.sha256(fullInput);
    }
}