import { JsonCreator, JsonInclude, JsonIncludeType } from "jackson-js";
import { AbstractMetadata } from "./internals";
import type { DIDStore } from "./internals";
import { DIDStoreException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { checkArgument } from "./internals";

@JsonInclude({value: JsonIncludeType.NON_NULL})
export class DIDStoreMetadata extends AbstractMetadata {
    static DID_STORE_TYPE = "did:elastos:store";
	static DID_STORE_VERSION = 3;

    private static TYPE = "type";
    private static VERSION = "version";
    private static FINGERPRINT = "fingerprint";
    private static DEFAULT_ROOT_IDENTITY = "defaultRootIdentity";
    private static log = new Logger("DIDStoreMetadata");

    constructor(store: DIDStore = null) {
        super(store);
        this.put(DIDStoreMetadata.TYPE, DIDStoreMetadata.DID_STORE_TYPE);
        this.put(DIDStoreMetadata.VERSION, DIDStoreMetadata.DID_STORE_VERSION);
    }

    /**
     * Called by Jackson when it wants to restore a class from json. Without this, it calls the constructor
     * with a json object and we don't want this.
     * Here we don't handle the json data as everything will be handled by the AbstractMetadata JsonAnySetter.
     */
    @JsonCreator()
    public static jacksonCreator(json: any) {
        return new DIDStoreMetadata(null);
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
            } catch (e) {
                if (e instanceof DIDStoreException)
                    DIDStoreMetadata.log.error("INTERNAL - error store metadata for DIDStore");
                throw e;
            }
        }
    }
}
