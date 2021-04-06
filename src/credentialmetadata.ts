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

import { AbstractMetadata } from "./abstractmetadata";
import { Cloneable } from "./cloneable";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { Logger } from "./logger";
import { checkArgument } from "./utils";

const log = new Logger("CredentialMetadata");

/**
 * The interface for Credential's meta data(include alias name, last modified time for Credential
 * and user's extra element).
 */
/**
 * The class defines the implement of Credential Meta data.
 */
export class CredentialMetadata extends AbstractMetadata implements Cloneable<CredentialMetadata> {
	private static TXID = "txid";
	private static PUBLISHED = "published";
	private static REVOKED = "revoked";

	private id: DIDURL;

	/**
	 * Construct the CredentialMetadataImpl with the given store.
	 *
	 * @param store the specified DIDStore
	 */
	protected constructor(id: DIDURL = null, store: DIDStore = null) {
		super(store);
		this.id = id;
	}

	protected setId(id: DIDURL) {
		this.id = id;
	}

	/**
	 * Set transaction id for CredentialMetadata.
	 *
	 * @param txid the transaction id string
	 */
	protected setTransactionId(txid: string) {
		this.put(CredentialMetadata.TXID, txid);
	}

	/**
	 * Get the last transaction id.
	 *
	 * @return the transaction string
	 */
	public getTransactionId(): string {
		return this.get(CredentialMetadata.TXID);
	}

	/**
	 * Set published time for CredentialMetadata.
	 *
	 * @param timestamp the time published
	 */
	protected setPublished(timestamp: Date) {
		checkArgument(timestamp != null, "Invalid timestamp");

		this.put(CredentialMetadata.PUBLISHED, timestamp);
	}

	/**
	 * Get the time of the latest declare transaction.
	 *
	 * @return the published time
	 */
	public getPublished(): Date {
		try {
			return this.getDate(CredentialMetadata.PUBLISHED);
		} catch (e) {
			// ParseException
			return null;
		}
	}

	/**
	 * Set revoked status into CredentialMetadata.
	 *
	 * @param revoked the revocation status
	 */
	protected setRevoked(revoked: boolean) {
		this.put(CredentialMetadata.REVOKED, revoked);
	}

	/**
	 * the DID revoked status.
	 *
	 * @return the returned value is true if the did is revoked.
	 *         the returned value is false if the did is not revoked.
	 */
	public isRevoked(): boolean {
		return this.getBoolean(CredentialMetadata.REVOKED);
	}

    /**
     * Returns a shallow copy of this instance: the keys and values themselves
     * are not cloned.
     *
     * @return a shallow copy of this object
     */
	public clone(): CredentialMetadata {
		try {
			return super.clone();
		} catch (e) {
			// CloneNotSupportedException
			log.error(e);
			return null;
		}
    }

	protected save() {
		if (this.attachedStore()) {
			try {
				this.getStore().storeCredentialMetadata(this.id, this);
			} catch (e) {
				// DIDStoreException
				log.error("INTERNAL - error store metadata for credential {}", this.id);
			}
		}
	}
}

