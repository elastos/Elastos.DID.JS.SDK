import {
    JsonValue
} from "jackson-js";
import { checkArgument } from "./internals";

export class DIDDocumentMultiSignature {
    private mv: number;
    private nv: number;

    public constructor(m: number, n: number) {
        this.apply(m, n);
    }

    public static newFromMultiSignature(ms: DIDDocumentMultiSignature): DIDDocumentMultiSignature {
        return new DIDDocumentMultiSignature(ms.m(), ms.n());
    }

    protected apply(m: number, n: number) {
        checkArgument(n > 1, "Invalid multisig spec: n should > 1");
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

    @JsonValue()
    public toString(): string {
        return this.mv.toString() + ":" + this.nv.toString();
    }
}
