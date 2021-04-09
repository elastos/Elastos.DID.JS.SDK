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

import { List as ImmutableList } from "immutable";
import { JsonCreator, JsonProperty, JsonPropertyOrder, JsonValue } from "jackson-js";
import { DIDURL } from "../didurl";
import { IllegalArgumentException, MalformedResolveResultException } from "../exceptions/exceptions";
import { CredentialTransaction } from "./credentialtransaction";
import { ResolveResult } from "./resolveresult";

export class Status {
	/**
	 * The credential is valid.
	 */
	public static VALID = new Status("valid", 0);
	/**
	 * The credential is expired.
	 */
	//public static EXPIRED = new Status("expired", 1);
	/**
	 * The credential is revoked.
	 */
	public static REVOKED = new Status("revoked", 2);
	/**
	 * The credential is not published.
	 */
	public static NOT_FOUND = new Status("not_found", 3);

	private constructor(private name: string, private value: number) {}

	@JsonValue()
	public getValue(): number {
		return this.value;
	}

	@JsonCreator()
	public static fromJson(value: number): Status {
		switch (value) {
		case 0:
			return Status.VALID;

		case 2:
			return Status.REVOKED;

		case 3:
			return Status.NOT_FOUND;

		default:
			throw new IllegalArgumentException("Invalid status value: " + value);
		}
	}

	public toString(): string {
		return this.name.toLowerCase();
	}
}

@JsonPropertyOrder({value: [
	 CredentialBiography.ID,
	CredentialBiography.STATUS,
	CredentialBiography.TRANSACTION
]})
@JsonCreator()
export class CredentialBiography extends ResolveResult<CredentialBiography> {
	protected static ID = "id";
	protected static STATUS = "status";
	protected static TRANSACTION = "transaction";

	@JsonProperty({value: CredentialBiography.ID})
	private id: DIDURL;
	@JsonProperty({value: CredentialBiography.STATUS})
	private status: Status;
	@JsonProperty({value: CredentialBiography.TRANSACTION})
	private txs: CredentialTransaction[];

	/**
	 * Constructs the Resolve Result with the given value.
	 *
	 * @param did the specified DID
	 * @param status the DID's status
	 */
	protected constructor(
			@JsonProperty({value: CredentialBiography.ID, required: true}) id: DIDURL,
			@JsonProperty({value: CredentialBiography.STATUS, required: true}) status: Status = undefined) {
		super();
		this.id = id;
		this.status = status;
	}

	public getId(): DIDURL {
		return this.id;
	}

	protected setStatus(status: Status) {
		this.status = status;
	}

	public getStatus(): Status {
		return this.status;
	}

	public getTransactionCount(): number {
		return this.txs != null ? this.txs.length : 0;
	}

	/**
	 * Get the index transaction content.
	 *
	 * @param index the index
	 * @return the index CredentialTransaction content
	 */
	public getTransaction(index: number): CredentialTransaction {
		return this.txs != null ? this.txs[index] : null;
	}

	public getAllTransactions(): ImmutableList<CredentialTransaction> {
		return ImmutableList(this.txs != null ? this.txs : []);
	}

	/**
	 * Add transaction infomation into IDChain Transaction.
	 * @param tx the DIDTransaction object
	 */
	protected addTransaction(tx: CredentialTransaction) {
		if (this.txs == null)
			this.txs = [];

		this.txs.push(tx);
	}

	public /* protected */ sanitize() {
		if (this.id == null)
			throw new MalformedResolveResultException("Missing id");

		if (this.status != Status.NOT_FOUND) {
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