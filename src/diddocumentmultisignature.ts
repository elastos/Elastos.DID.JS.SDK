import { IllegalArgumentException } from "./exceptions/exceptions"
import { checkArgument } from "./internals";

export class DIDDocumentMultiSignature {
    public static ONE_OF_ONE = new DIDDocumentMultiSignature(1, 1);
    private mv: number;
    private nv: number;

    public constructor(m: number, n: number) {
        this.apply(m, n);
    }

    public static fromString(mOfN: string): DIDDocumentMultiSignature {
        if (!mOfN || mOfN == null)
            throw new IllegalArgumentException("Invalid multisig spec");

        let mn: string[] = mOfN.split(":");
        if (mn == null || mn.length != 2)
            throw new IllegalArgumentException("Invalid multisig spec");

        return new DIDDocumentMultiSignature(Number.parseInt(mn[0]), Number.parseInt(mn[1]));
    }

    public static newFromMultiSignature(ms: DIDDocumentMultiSignature): DIDDocumentMultiSignature {
        return new DIDDocumentMultiSignature(ms.m(), ms.n());
    }

    protected apply(m: number, n: number) {
        checkArgument(n > 0, "Invalid multisig spec: n should > 0");
        checkArgument(m > 0 && m <= n, "Invalid multisig spec: m should > 0 and <= n");

        this.mv = m;
        this.nv = n;
    }

    public m(): number {
        return this.mv;
    }

    public n(): number {
        return this.nv;
    }

    public equals(multisig: DIDDocumentMultiSignature): boolean {
        if (this == multisig)
            return true;

        return this.mv == multisig.mv && this.nv == multisig.nv;
    }

    public toString(): string {
        return this.mv.toString() + ":" + this.nv.toString();
    }
}
