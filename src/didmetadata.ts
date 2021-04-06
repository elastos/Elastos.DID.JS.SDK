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
import { DID } from "./did";
import { DIDStore } from "./didstore";
import { DIDStoreException } from "./exceptions/exceptions";

/**
 * The class defines the implement of DID Metadata.
 */
export class DIDMetadata extends AbstractMetadata<DIDMetadata> implements Cloneable<DIDMetadata> {
	private static ROOT_IDENTITY = "rootIdentity";
	private static INDEX = "index";
	private static TXID = "txid";
	private static PREV_SIGNATURE = "prevSignature";
	private static SIGNATURE = "signature";
	private static PUBLISHED = "published";
	private static DEACTIVATED = "deactivated";

	private did: DID | null = null;

	/**
	 * Constructs the empty DIDMetadataImpl with the given store.
	 *
	 * @param store the specified DIDStore
	 */
	public constructor(did: DID | null = null, store: DIDStore | null = null) {
		super(store);
		this.did = did;
	}

	protected setDid(did: DID) {
		this.did = did;
	}

	protected setRootIdentityId(id: string) {
		this.put(DIDMetadata.ROOT_IDENTITY, id);
	}

	protected getRootIdentityId(): string {
		return this.get(DIDMetadata.ROOT_IDENTITY);
	}

	protected setIndex(index: number) {
		this.put(DIDMetadata.INDEX, index);
	}

	protected getIndex(): number {
		return this.getInteger(DIDMetadata.INDEX);
	}

	/**
	 * Set transaction id into DIDMetadata.
	 *
	 * @param txid the transaction id string
	 */
	protected setTransactionId(txid: string) {
		this.put(DIDMetadata.TXID, txid);
	}

	/**
	 * Get the last transaction id.
	 *
	 * @return the transaction string
	 */
	public getTransactionId(): string {
		return this.get(DIDMetadata.TXID);
	}

	/**
	 * Set previous signature into DIDMetadata.
	 *
	 * @param signature the signature string
	 */
	protected setPreviousSignature(signature: string) {
		this.put(DIDMetadata.PREV_SIGNATURE, signature);
	}

	/**
	 * Get the document signature from the previous transaction.
	 *
	 * @return the signature string
	 */
	public getPreviousSignature(): string {
		return this.get(DIDMetadata.PREV_SIGNATURE);
	}

	/**
	 * Set signature into DIDMetadata.
	 *
	 * @param signature the signature string
	 */
	protected setSignature(signature: string) {
		this.put(DIDMetadata.SIGNATURE, signature);
	}

	/**
	 * Get the document signature from the lastest transaction.
	 *
	 * @return the signature string
	 */
	public getSignature(): string {
		return this.get(DIDMetadata.SIGNATURE);
	}

	/**
	 * Set published time into DIDMetadata.
	 *
	 * @param timestamp the time published
	 */
	protected setPublished(timestamp: Date) {
		this.put(DIDMetadata.PUBLISHED, timestamp);
	}

	/**
	 * Get the time of the lastest published transaction.
	 *
	 * @return the published time
	 */
	public getPublished(): Date | null {
		try {
			return this.getDate(DIDMetadata.PUBLISHED);
		} catch (e) {
			return null;
		}
	}

	/**
	 * Set deactivate status into DIDMetadata.
	 *
	 * @param deactivated the deactivate status
	 */
	protected setDeactivated(deactivated: boolean) {
		this.put(DIDMetadata.DEACTIVATED, deactivated);
	}

	/**
	 * the DID deactivated status.
	 *
	 * @return the returned value is true if the did is deactivated.
	 *         the returned value is false if the did is activated.
	 */
	public isDeactivated(): boolean {
		return this.getBoolean(DIDMetadata.DEACTIVATED);
	}

    /**
     * Returns a shallow copy of this instance: the keys and values themselves
     * are not cloned.
     *
     * @return a shallow copy of this object
     */
	public clone(): DIDMetadata  | null {
		let clonedData: DIDMetadata = new DIDMetadata();
		clonedData.props = this.props;
		clonedData.did = this.did;
		clonedData.store = this.store;
		return clonedData;
    }

	protected save() {
		if (!this.attachedStore()) {
			throw new DIDStoreException();
		}
		try {
			//this.getStore()?.storeDidMetadata(this.did, this);
		} catch (e) {
			if (e instanceof DIDStoreException)
				console.log("INTERNAL - error store metadata for DID {}", this.did);
		}
	}
}