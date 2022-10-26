/*
 * Copyright (c) 2019 Elastos Foundation
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

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import { InvalidKeyException } from "./exceptions/exceptions";
import type { DIDDocument, DIDStore } from "./internals";
import { checkArgument, DID, DIDURL, VerifiableCredential } from "./internals";


/**
 * A issuer is the DID to issue Credential. Issuer includes issuer's did and
 * issuer's sign key.
 */
export class Issuer {
    private readonly self: DIDDocument;
    private readonly signKey: DIDURL;

    private constructor(doc: DIDDocument, signKey?: DIDURL) {
        this.self = doc;

        if (signKey) {
            if (!this.self.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString() + " isn't the authentication key");
        } else {
            signKey = this.self.getDefaultPublicKeyId();
            if (signKey == null)
                throw new InvalidKeyException("Need explict sign key or effective controller");
        }

        this.signKey = signKey;
    }

    public static async create(doc: DIDDocument, signKey?: DIDURL): Promise<Issuer> {
        checkArgument(doc != null, "Invalid document");

        const issuer = new Issuer(doc, signKey);

        if (!(await doc.hasPrivateKey(issuer.signKey)))
            throw new InvalidKeyException("No private key: " + signKey);

        return issuer;
    }

    /**
     * Constructs Issuer object with the given value.
     *
     * @param doc the Issuer's document
     * @param signKey the specified issuer's key to sign
     * @throws DIDStoreException there is no store to attatch
     * @throws InvalidKeyException the sign key is not an authenication key.
     */
    public static async newWithDocument(doc: DIDDocument, signKey?: DIDURL | string): Promise<Issuer> {
        checkArgument(doc != null, "Invalid document");

        if (signKey) {
            if (signKey instanceof DIDURL) {
                return await Issuer.create(doc, signKey);
            } else {
                return await Issuer.create(doc, DIDURL.from(signKey, doc.getSubject()));
            }
        } else {
            return await Issuer.create(doc);
        }
    }

    public static async newWithDID(did: DID, store: DIDStore, signKey?: DIDURL | string): Promise<Issuer> {
        checkArgument(did != null, "Invalid did");
        checkArgument(store != null, "Invalid store");

        let didDoc: DIDDocument = await store.loadDid(did);

        if (signKey) {
            if (signKey instanceof DIDURL) {
                return await Issuer.create(didDoc, signKey);
            } else {
                return await Issuer.create(didDoc, DIDURL.from(signKey, did));
            }
        } else {
            return await Issuer.create(didDoc);
        }
    }

    /**
     * Get Issuer's DID.
     *
     * @return the DID object
     */
    public getDid(): DID {
        return this.self.getSubject();
    }

    /**
     * Get issuer's DIDDocument.
     *
     * @return the DIDDocument object.
     */
    protected getDocument(): DIDDocument {
        return this.self;
    }

    /**
     * Get Issuer's sign key.
     *
     * @return the sign key
     */
    public getSignKey(): DIDURL {
        return this.signKey;
    }

    public sign(storepass: string, data: Buffer): Promise<string> {
        return this.self.signWithId(this.signKey, storepass, data);
    }

    /**
     * Issue Credential to the specified DID.
     *
     * @param did the owner of Credential
     * @return the VerifiableCredential builder to issuer Credential
     */
    public issueFor(did: DID | string): VerifiableCredential.Builder {
        checkArgument(did != null, "Invalid did");

        if (did instanceof DID) {
            return new VerifiableCredential.Builder(this, did);
        }
        return new VerifiableCredential.Builder(this, DID.from(did));
    }
}
