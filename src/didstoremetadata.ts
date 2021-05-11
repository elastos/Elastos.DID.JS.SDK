import { AbstractMetadata } from "./abstractmetadata";
import { DIDStore } from "./didstore";
import { checkArgument } from "./utils";
import { DIDStoreException } from "./exceptions/exceptions";
import { Logger } from "./logger";

export class DIDStoreMetadata extends AbstractMetadata {
    static DID_STORE_TYPE: string = "did:elastos:store";
	static DID_STORE_VERSION = 3;

    private static TYPE = "type";
    private static VERSION = "version";
    private static FINGERPRINT = "fingerprint";
    private static DEFAULT_ROOT_IDENTITY = "defaultRootIdentity";
    private static log = new Logger("DIDStoreMetadata");

    constructor(store: DIDStore | null = null) {
        super(store);
        this.put(DIDStoreMetadata.TYPE, DIDStoreMetadata.DID_STORE_TYPE);
        this.put(DIDStoreMetadata.VERSION, DIDStoreMetadata.DID_STORE_VERSION);
    }

    public getType(): string {
        return this.get(DIDStoreMetadata.TYPE) as string;
    }

    public getVersion(): number {
        return this.getInteger(DIDStoreMetadata.VERSION);
    }

    public setFingerprint(fingerprint: string) {
        checkArgument(fingerprint != null && fingerprint != "", "Invalid fingerprint");

        this.put(DIDStoreMetadata.FINGERPRINT, fingerprint);
    }

    public getFingerprint(): string {
        return this.get(DIDStoreMetadata.FINGERPRINT) as string;
    }

    public setDefaultRootIdentity(id: string) {
        this.put(DIDStoreMetadata.DEFAULT_ROOT_IDENTITY, id);
    }

    public getDefaultRootIdentity(): string {
        return this.get(DIDStoreMetadata.DEFAULT_ROOT_IDENTITY) as string;
    }

    protected save() {
        if (this.attachedStore()) {
            try {
                this.getStore().storage.storeMetadata(this);
            } catch (ignore) {
                if (ignore instanceof DIDStoreException)
                DIDStoreMetadata.log.error("INTERNAL - error store metadata for DIDStore");
            }
        }
    }
}
