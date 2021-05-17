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

import { JsonCreator, JsonInclude, JsonIncludeType, JsonProperty, JsonPropertyOrder, JsonValue } from "jackson-js";
import { List as ImmutableList } from "immutable";
import { DID } from "../internals";
import { IllegalArgumentException, MalformedResolveResultException } from "../exceptions/exceptions";
import { ResolveResult } from "./resolveresult";
import { DIDTransaction } from "./didtransaction";

export class DIDBiographyStatus {
	/**
	 * The credential is valid.
	 */
	public static VALID = new DIDBiographyStatus("valid", 0);
	/**
	 * The credential is deactivated.
	 */
	public static DEACTIVATED = new DIDBiographyStatus("deactivated", 2);
	/**
	 * The credential is not published.
	 */
	public static NOT_FOUND = new DIDBiographyStatus("not_found", 3);

	private constructor(private name: string, private value: number) {}

	@JsonValue()
	public getValue(): number {
		return this.value;
	}

	@JsonCreator()
	public static fromJson(value: number): DIDBiographyStatus {
		switch (value) {
		case 0:
			return DIDBiographyStatus.VALID;

		case 2:
			return DIDBiographyStatus.DEACTIVATED;

		case 3:
			return DIDBiographyStatus.NOT_FOUND;

		default:
			throw new IllegalArgumentException("Invalid status value: " + value);
		}
	}

	public toString(): string {
		return this.name.toLowerCase();
	}

	public equals(status: DIDBiographyStatus): boolean {
		return this.value == status.value;
	}
}

/**
 * The class records the resolved content.
 */
@JsonPropertyOrder({value: [
	DIDBiography.DID,
	DIDBiography.STATUS,
	DIDBiography.TRANSACTION
]})
@JsonInclude({value: JsonIncludeType.NON_NULL})
export class DIDBiography extends ResolveResult<DIDBiography> {
	protected static DID = "did";
	protected static STATUS = "status";
	protected static TRANSACTION = "transaction";

	@JsonProperty({value: DIDBiography.DID})
	private did: any; //DID;
	@JsonProperty({value: DIDBiography.STATUS})
	private status: DIDBiographyStatus;
	@JsonProperty({value: DIDBiography.TRANSACTION})
	private txs: DIDTransaction[];

	/**
	 * Constructs the Resolve Result with the given value.
	 *
	 * @param did the specified DID
	 * @param status the DID's status
	 */
	@JsonCreator()
	protected static toDIDBiography(
		@JsonProperty({value: DIDBiography.DID, required: true}) did: any /* DID */,
		@JsonProperty({value: DIDBiography.STATUS, required: true}) status: DIDBiographyStatus
	) {
			let didBiography = new DIDBiography(did);
			didBiography.status = status;
			return didBiography;
	}

	protected constructor(did: any /* DID */) {
		super();
		this.did = did;
	}

	public getDid(): DID {
		return this.did;
	}

	protected setStatus(status: DIDBiographyStatus) {
		this.status = status;
	}

	public getStatus(): DIDBiographyStatus {
		return this.status;
	}

	public getTransactionCount(): number {
		return this.txs != null ? this.txs.length : 0;
	}

	/**
	 * Get the index transaction content.
	 *
	 * @param index the index
	 * @return the index DIDTransaction content
	 */
	public getTransaction(index: number): DIDTransaction {
		return this.txs != null ? this.txs[index] : null;
	}

	public getAllTransactions(): ImmutableList<DIDTransaction> {
		return ImmutableList(this.txs != null ? this.txs : []);
	}

	/**
	 * Add transaction infomation into IDChain Transaction.
	 * @param tx the DIDTransaction object
	 */
	protected addTransaction(tx: DIDTransaction) {
		if (this.txs == null)
			this.txs = [];

		this.txs.push(tx);
	}

	public sanitize() {
		if (this.did == null)
			throw new MalformedResolveResultException("Missing did");

		if (!this.status.equals(DIDBiographyStatus.NOT_FOUND)) {
			if (this.txs == null || this.txs.length == 0)
				throw new MalformedResolveResultException("Missing transaction");

			try {
				for (let tx of this.txs)
					tx.sanitize();
			} catch (e) {
				// MalformedIDChainTransactionException
				throw new MalformedResolveResultException("Invalid transaction", e);
			}
		} else {
			if (this.txs != null)
				throw new MalformedResolveResultException("Should not include transaction");
		}
	}
}
