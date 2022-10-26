/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { AbstractMetadata } from "./internals";
import type { DIDStore } from "./internals";
import { DIDEntity } from "./internals";
import { JSONObject } from "./json";
import { DIDStoreException, MalformedMetadataException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { checkArgument } from "./internals";

export class DIDStoreMetadata extends AbstractMetadata {
    static DID_STORE_TYPE = "did:elastos:store";
    static DID_STORE_VERSION = 3;

    private static TYPE = "type";
    private static VERSION = "version";
    private static FINGERPRINT = "fingerprint";
    private static DEFAULT_ROOT_IDENTITY = "defaultRootIdentity";
    private static log = new Logger("DIDStoreMetadata");

    protected constructor(store: DIDStore = null) {
        super(store);
    }

    public static async create(store: DIDStore = null): Promise<DIDStoreMetadata> {
        const metadata = new DIDStoreMetadata(store);
        await metadata.put(DIDStoreMetadata.TYPE, DIDStoreMetadata.DID_STORE_TYPE);
        await metadata.put(DIDStoreMetadata.VERSION, DIDStoreMetadata.DID_STORE_VERSION);
        return metadata;
    }

    public getType(): string {
        return this.get(DIDStoreMetadata.TYPE) as string;
    }

    public getVersion(): number {
        return this.getInteger(DIDStoreMetadata.VERSION, -1);
    }

    public setFingerprint(fingerprint: string): Promise<void> {
        checkArgument(fingerprint != null && fingerprint != "", "Invalid fingerprint");

        return this.put(DIDStoreMetadata.FINGERPRINT, fingerprint);
    }

    public getFingerprint(): string {
        return this.get(DIDStoreMetadata.FINGERPRINT) as string;
    }

    public setDefaultRootIdentity(id: string): Promise<void> {
        return this.put(DIDStoreMetadata.DEFAULT_ROOT_IDENTITY, id);
    }

    public getDefaultRootIdentity(): string {
        return this.get(DIDStoreMetadata.DEFAULT_ROOT_IDENTITY) as string;
    }

    protected async save(): Promise<void> {
        if (this.attachedStore()) {
            try {
                await this.getStore().storage.storeMetadata(this);
            } catch (e) {
                if (e instanceof DIDStoreException)
                    DIDStoreMetadata.log.error("INTERNAL - error store metadata for DIDStore");
                throw e;
            }
        }
    }

    public static async parse(content: string | JSONObject, context = null): Promise<DIDStoreMetadata> {
        try {
            let metadata = await DIDStoreMetadata.create();
            return DIDEntity.deserializeWithObj(content, metadata, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedMetadataException)
                throw e;
            else
                throw new MalformedMetadataException(e);
        }
    }
}
