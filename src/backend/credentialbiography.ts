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

import { DIDURL } from "../internals";
import { DIDEntity } from "../internals";
import { IllegalArgumentException, MalformedResolveResultException } from "../exceptions/exceptions";
import { CredentialTransaction } from "../internals";
import { ResolveResponse } from "../internals";
import { JSONObject } from "../json";

export class CredentialBiographyStatus {
    protected name: string;
    protected value: number;

    public constructor(value: number, name: string, ) {
        this.name = name;
        this.value = value;
    }

    public getValue(): number {
        return this.value;
    }

    public static fromValue(value: string | number): CredentialBiographyStatus {
        switch(String(value)) {
            case "0":
                return CredentialBiographyStatus.VALID;
            case "2":
                return CredentialBiographyStatus.REVOKED;
            case "3":
                return CredentialBiographyStatus.NOT_FOUND;
            default:
                throw new IllegalArgumentException("Invalid CredentialBiographyStatus");
        }
    }

    public toString(): string {
        return this.name.toLowerCase();
    }

    public equals(status: CredentialBiographyStatus): boolean {
        return this.value == status.value;
    }
}

/* eslint-disable no-class-assign */
export namespace CredentialBiographyStatus {
    /**
     * The credential is valid.
     */
    export const VALID = new CredentialBiographyStatus(0, "valid");
     /**
      * The credential is expired.
      */
     //public static EXPIRED = new CredentialBiographyStatus("expired", 1);
     /**
      * The credential is revoked.
      */
    export const REVOKED = new CredentialBiographyStatus(2, "revoked");
     /**
      * The credential is not published.
      */
    export const NOT_FOUND = new CredentialBiographyStatus(3, "not_found");
}

export class CredentialBiography extends ResolveResponse.Result<CredentialBiography> {
    private id: DIDURL;
    private status: CredentialBiographyStatus;
    private txs: CredentialTransaction[];

    /**
     * Constructs the Resolve Result with the given value.
     *
     * @param did the specified DID
     * @param status the DID's status
     */
    public constructor(id: DIDURL = null, status: CredentialBiographyStatus = null) {
        super();
        this.id = id;
        this.status = status;
    }

    public getId(): DIDURL {
        return this.id;
    }

    protected setStatus(status: CredentialBiographyStatus) {
        this.status = status;
    }

    public getStatus(): CredentialBiographyStatus {
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

    public getAllTransactions(): CredentialTransaction[] {
        return this.txs != null ? this.txs : [];
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

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        json.id = this.id.toString();
        json.status = this.status.toString();

        if (this.txs && this.txs.length > 0)
            json.transaction = Array.from(this.txs, (tx) => tx.toJSON())

        return json;
    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.id = this.getDidUrl("id", json.id, {mandatory: true, nullable: false});

        let s = this.getNumber("status", json.status, {mandatory: true, nullable: false});
        this.status = CredentialBiographyStatus.fromValue(s);

        if (!this.status.equals(CredentialBiographyStatus.NOT_FOUND)) {
            if (!json.transaction)
                throw new MalformedResolveResultException("Missing transaction");

            if (!Array.isArray(json.transaction) || json.transaction.length == 0)
                throw new MalformedResolveResultException("Invalid transaction");

            this.txs = Array.from(json.transaction, (o) => CredentialTransaction.parse(o as JSONObject));
        } else {
            if (json.transaction)
                throw new MalformedResolveResultException("Should not include transaction");
        }
    }

    /**
     * @Internal (tag for docs)
    */
    public static parse(content: string | JSONObject, context = null): CredentialBiography {
        try {
            return DIDEntity.deserialize(content, CredentialBiography, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedResolveResultException)
                throw e;
            else
                throw new MalformedResolveResultException(e);
        }
    }
}
