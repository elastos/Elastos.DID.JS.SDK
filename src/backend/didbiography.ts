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

import { DID } from "../internals";
import { DIDEntity } from "../internals";
import { JSONObject } from "../json";
import { IllegalArgumentException, MalformedResolveResultException } from "../exceptions/exceptions";
import { ResolveResponse } from "../internals";
import { DIDTransaction } from "../internals";

export class DIDBiographyStatus {
    protected name: string;
    protected value: number;

    public constructor(value: number, name: string, ) {
        this.name = name;
        this.value = value;
    }

    public getValue(): number {
        return this.value;
    }

    public static fromValue(value: string | number): DIDBiographyStatus {
        switch(String(value)) {
            case "0":
                return DIDBiographyStatus.VALID;
            case "2":
                return DIDBiographyStatus.DEACTIVATED;
            case "3":
                return DIDBiographyStatus.NOT_FOUND;
            default:
                throw new IllegalArgumentException("Invalid DIDBiographyStatus");
        }
    }

    public toString(): string {
        return this.name.toLowerCase();
    }

    public equals(status: DIDBiographyStatus): boolean {
        return this.value == status.value;
    }
}

/* eslint-disable no-class-assign */
export namespace DIDBiographyStatus {
    /**
     * The credential is valid.
     */
    export const VALID = new DIDBiographyStatus(0, "valid");
     /**
      * The credential is deactivated.
      */
    export const DEACTIVATED = new DIDBiographyStatus(2, "deactivated");
     /**
      * The credential is not published.
      */
    export const NOT_FOUND = new DIDBiographyStatus(3, "not_found");
}
/* eslint-enable no-class-assign */

/**
 * The class records the resolved content.
 */
export class DIDBiography extends ResolveResponse.Result<DIDBiography> {
    private did: DID;
    private status: DIDBiographyStatus;
    private txs: DIDTransaction[];

    public constructor(did: DID = null) {
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

    public getAllTransactions(): DIDTransaction[] {
        return this.txs != null ? this.txs : [];
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

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        json.did = this.did.toString();
        json.status = this.status.toString();

        if (this.txs && this.txs.length > 0)
            json.transaction = Array.from(this.txs, (tx) => tx.toJSON())

        return json;

    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.did = super.getDid("did", json.did, {mandatory: true, nullable: false});

        let s = this.getNumber("status", json.status, {mandatory: true, nullable: false});
        this.status = DIDBiographyStatus.fromValue(s);

        if (!this.status.equals(DIDBiographyStatus.NOT_FOUND)) {
            if (!json.transaction)
                throw new MalformedResolveResultException("Missing transaction");

            if (!Array.isArray(json.transaction) || json.transaction.length == 0)
                throw new MalformedResolveResultException("Invalid transaction");

            this.txs = Array.from(json.transaction, (o) => DIDTransaction.parse(o as JSONObject));
        } else {
            if (json.transaction)
                throw new MalformedResolveResultException("Should not include transaction");
        }
    }

    public static parse(content: string | JSONObject, context = null): DIDBiography {
        try {
            return DIDEntity.deserialize(content, DIDBiography, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedResolveResultException)
                throw e;
            else
                throw new MalformedResolveResultException(e);
        }
    }
}
