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

import { Constants } from "./constants";
import { DID, DIDURL } from "./internals";
import { DIDEntity } from "./internals";
import { JSONObject } from "./json";
import type { Comparable } from "./comparable";

/**
 * The Proof represents the proof content of DID Document.
 */
export class DIDDocumentProof extends DIDEntity<DIDDocumentProof> implements Comparable<DIDDocumentProof> {
    private type: string;
    private created: Date;
    private creator: DIDURL;
    private signature: string;

    /**
     * Constructs the proof of DIDDocument with the given value.
     *
     * @param type the type of Proof
     * @param created the time to create DIDDocument
     * @param creator the key to sign
     * @param signature the signature string
     */
    constructor(creator: DIDURL = null, signature: string = null,
            created: Date = new Date(), type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
        super();
        this.type = type ? type : Constants.DEFAULT_PUBLICKEY_TYPE;

        if (created === undefined)
            this.created = new Date();
        else if (created !== null)
            this.created = new Date(created);
        else
            this.created = null;

        if (this.created)
            this.created.setMilliseconds(0);

        this.creator = creator;
        this.signature = signature;
    }

    equals(obj: DIDDocumentProof): boolean {
        return this.compareTo(obj) == 0;
    }

    /**
     * Get Proof type.
     *
     * @return the type string
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get the time to create DIDDocument.
     *
     * @return the time
     */
    public getCreated(): Date {
        return this.created;
    }

    /**
     * Get the key id to sign.
     *
     * @return the key id
     */
    public getCreator(): DIDURL {
        return this.creator;
    }

    /**
     * Get signature string.
     *
     * @return the signature string
     */
    public getSignature(): string {
        return this.signature;
    }

    public compareTo(proof: DIDDocumentProof): number {
        let rc: number = this.created.getTime() - proof.created.getTime();
        if (rc == 0)
            rc = this.creator.compareTo(proof.creator);
        return rc;
    }

    public toJSON(key: string = null): JSONObject {
        let context: DID = key ? new DID(key) : null;

        let json: JSONObject = {};
        if (!context || this.type !== Constants.DEFAULT_PUBLICKEY_TYPE)
            json.type = this.type;
        if (this.created)
            json.created = this.dateToString(this.created);

        json.creator = this.creator.toString(context);
        json.signatureValue = this.signature;

        return json;
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        // TODO: need improve
        let defaultKey = this.getDidUrl("INTERNAL", json.__defaultPublicKey__,
                {mandatory: false, nullable: true, defaultValue: null});

        this.type = this.getString("proof.type", json.type,
                {mandatory: false, defaultValue: Constants.DEFAULT_PUBLICKEY_TYPE});
        this.created = this.getDate("proof.created", json.created,
                {mandatory: false});
        this.creator = this.getDidUrl("proof.creator", json.creator,
                {mandatory: false, nullable: false, context: context, defaultValue: defaultKey});
        this.signature = this.getString("proof.signatureValue", json.signatureValue,
                {mandatory: true, nullable: false});
    }
}
