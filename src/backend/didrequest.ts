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

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import { Buffer } from "buffer";
import {
    InvalidKeyException,
    MalformedIDChainRequestException,
    UnknownInternalException
} from "../exceptions/exceptions";
import type { DIDURL, TransferTicket } from "../internals";
import { BASE64, DID, DIDDocument, DIDEntity } from "../internals";
import { JSONObject } from "../json";
import { IDChainRequest } from "./idchaindrequest";

/**
 * The DID request class.
 */
export class DIDRequest extends IDChainRequest<DIDRequest> {
    private did: DID;
    private doc: DIDDocument;

    private static newWithOperation(operation: IDChainRequest.Operation): DIDRequest {
        let didRequest = new DIDRequest();
        didRequest.constructWithOperation(operation);
        return didRequest;
    }

    private static newWithPreviousTxId(operation: IDChainRequest.Operation, previousTxid: string): DIDRequest {
        let didRequest = new DIDRequest();
        didRequest.constructWithPreviousTxId(operation, previousTxid);
        return didRequest;
    }

    private static newWithTransferTicket(operation: IDChainRequest.Operation, ticket: TransferTicket): DIDRequest {
        let didRequest = new DIDRequest();
        didRequest.constructWithTransferTicket(operation, ticket);
        return didRequest;
    }

    protected static newWithDIDRequest(request: DIDRequest) {
        let didRequest = new DIDRequest();
        didRequest.constructWithIDChainRequest(request);
        didRequest.did = request.did;
        didRequest.doc = request.doc;
    }

    /**
     * Constructs the 'create' DID Request.
     *
     * @param doc the DID Document be packed into Request
     * @param signKey the key to sign Request
     * @param storepass the password for DIDStore
     * @return the IDChainRequest object
     * @throws DIDStoreException there is no store to attach.
     */
    public static async create(doc: DIDDocument, signKey: DIDURL, storepass: string): Promise<DIDRequest> {
        let request = DIDRequest.newWithOperation(IDChainRequest.Operation.CREATE);
        request.setPayload(doc);
        try {
            await request.seal(signKey, storepass);
        } catch (ignore) {
            // MalformedIDChainRequestException
            throw new UnknownInternalException(ignore);
        }

        return request;
    }

    /**
     * Constructs the 'update' DID Request.
     *
     * @param doc the DID Document be packed into Request
     * @param previousTxid the previous transaction id string
     * @param signKey the key to sign Request
     * @param storepass the password for DIDStore
     * @return the IDChainRequest object
     * @throws DIDStoreException there is no store to attach.
     */
    public static async update(doc: DIDDocument, previousTxid: string, signKey: DIDURL, storepass: string): Promise<DIDRequest> {
        let request = DIDRequest.newWithPreviousTxId(IDChainRequest.Operation.UPDATE, previousTxid);
        request.setPayload(doc);
        try {
            await request.seal(signKey, storepass);
        } catch (ignore) {
            // MalformedIDChainRequestException
            throw new UnknownInternalException(ignore);
        }

        return request;
    }

    /**
     * Constructs the 'transfer' DID Request.
     *
     * @param doc target DID document
     * @param ticket the transfer ticket object
     * @param signKey the key to sign Request
     * @param storepass the password for DIDStore
     * @return the IDChainRequest object
     * @throws DIDStoreException there is no store to attach.
     */
    public static async transfer(doc: DIDDocument, ticket: TransferTicket, signKey: DIDURL, storepass: string): Promise<DIDRequest> {
        let request = DIDRequest.newWithTransferTicket(IDChainRequest.Operation.TRANSFER, ticket);
        request.setPayload(doc);
        try {
            await request.seal(signKey, storepass);
        } catch (ignore) {
            // MalformedIDChainRequestException
            throw new UnknownInternalException(ignore);
        }

        return request;
    }

    /**
     * Constructs the 'deactivate' DID Request.
     *
     * @param doc the DID Document be packed into Request
     * @param signKey the key to sign Request
     * @param storepass the password for DIDStore
     * @return the IDChainRequest object
     * @throws DIDStoreException there is no store to attach.
     */
    public static async deactivate(doc: DIDDocument, signKey: DIDURL, storepass: string): Promise<DIDRequest> {
        let request = DIDRequest.newWithOperation(IDChainRequest.Operation.DEACTIVATE);
        request.setPayload(doc);
        try {
            await request.seal(signKey, storepass);
        } catch (ignore) {
            // MalformedIDChainRequestException
            throw new UnknownInternalException(ignore);
        }

        return request;
    }

    /**
     * Constructs the 'deactivate' DID Request.
     *
     * @param target the DID to be deactivated
     * @param targetSignKey the target DID's key to sign
     * @param doc the authorizer's document
     * @param signKey the key to sign Request
     * @param storepass the password for DIDStore
     * @return the IDChainRequest object
     * @throws DIDStoreException there is no store to attach
     */
    // NOTE: Also deactivate() in Java
    public static async deactivateTarget(target: DIDDocument, targetSignKey: DIDURL, doc: DIDDocument, signKey: DIDURL, storepass: string): Promise<DIDRequest> {
        let request = DIDRequest.newWithOperation(IDChainRequest.Operation.DEACTIVATE);
        request.setPayload(target);
        try {
            await request.sealTarget(targetSignKey, doc, signKey, storepass);
        } catch (ignore) {
            // MalformedIDChainRequestException
        }

        return request;
    }

    /**
     * Get previous transaction id string.
     *
     * @return the transaction id string
     */
    public getPreviousTxid(): string {
        return this.getHeader().getPreviousTxid();
    }

    /**
     * Get transfer ticket object.
     *
     * @return the TransferTicket object
     */
    public getTransferTicket(): TransferTicket {
        return this.getHeader().getTransferTicket();
    }

    /**
     * Get target DID of DID Request.
     *
     * @return the DID object
     */
    public getDid(): DID {
        return this.did;
    }

    /**
     * Get DID Document of DID Request.
     *
     * @return the DIDDocument object
     */
    public getDocument(): DIDDocument {
        return this.doc;
    }

    public setPayload(docOrString: DIDDocument | string) {
        if (docOrString instanceof DIDDocument) {
            this.doc = docOrString;
            this.did = this.doc.getSubject();

            if (!this.getHeader().getOperation().equals(IDChainRequest.Operation.DEACTIVATE)) {
                let json = this.doc.toString(true);
                let jsonBuffer = Buffer.from(json, "utf-8")
                this.setPayload(BASE64.fromString(jsonBuffer.toString()));
            } else {
                super.setPayload(this.doc.getSubject().toString());
            }
        }
        else {
            super.setPayload(docOrString);
        }
    }

    protected sanitize(): void {
        let header = this.getHeader();

        if (header == null)
            throw new MalformedIDChainRequestException("Missing header");

        if (header.getSpecification() == null)
            throw new MalformedIDChainRequestException("Missing specification");

        if (header.getSpecification() !== DIDRequest.DID_SPECIFICATION)
            throw new MalformedIDChainRequestException("Unsupported specification");

        let operation = header.getOperation();
        if (operation.equals(IDChainRequest.Operation.CREATE)) { }
        else if (operation.equals(IDChainRequest.Operation.UPDATE)) {
            if (header.getPreviousTxid() == null || header.getPreviousTxid() === "")
                throw new MalformedIDChainRequestException("Missing previousTxid");
        }
        else if (operation.equals(IDChainRequest.Operation.TRANSFER)) {
            if (header.getTicket() == null || header.getTicket() === "")
                throw new MalformedIDChainRequestException("Missing ticket");
        }
        else if (operation.equals(IDChainRequest.Operation.DEACTIVATE)) {
        }
        else {
            throw new MalformedIDChainRequestException("Invalid operation " + header.getOperation().toString());
        }

        let payload = this.getPayload();
        if (payload == null || payload === "")
            throw new MalformedIDChainRequestException("Missing payload");

        let proof = this.getProof();
        if (proof == null)
            throw new MalformedIDChainRequestException("Missing proof");

        try {
            if (!header.getOperation().equals(IDChainRequest.Operation.DEACTIVATE)) {
                let json = BASE64.toString(payload)
                this.doc = DIDDocument._parseOnly(json); // CHECKME: !!!
                this.did = this.doc.getSubject();
            } else {
                this.did = new DID(payload);
            }
        } catch (e) {
            // DIDException
            throw new MalformedIDChainRequestException("Invalid payload", e);
        }

        proof.qualifyVerificationMethod(this.did);
    }

    private async seal(signKey: DIDURL, storepass: string): Promise<void> {
        if (!this.doc.isAuthenticationKey(signKey))
            throw new InvalidKeyException("Not an authentication key.");

        if (this.getPayload() == null || this.getPayload() === "")
            throw new MalformedIDChainRequestException("Missing payload");

        let signature = await this.doc.signWithId(signKey, storepass, ...this.getSigningInputs());
        this.setProof(new DIDRequest.Proof(signKey, signature));
    }

    // NOTE: Also seal() in Java
    private async sealTarget(targetSignKey: DIDURL, doc: DIDDocument, signKey: DIDURL, storepass: string): Promise<void> {
        if (!this.doc.isAuthorizationKey(targetSignKey))
            throw new InvalidKeyException("Not an authorization key: " + targetSignKey);

        if (!doc.isAuthenticationKey(signKey))
            throw new InvalidKeyException("Not an authentication key: " + signKey);

        if (!this.getPayload() || this.getPayload() == null)
            throw new MalformedIDChainRequestException("Missing payload");

        let signature = await doc.signWithId(signKey, storepass, ...this.getSigningInputs());
        this.setProof(new DIDRequest.Proof(targetSignKey, signature));
    }

    protected async getSignerDocument(): Promise<DIDDocument> {
        if (this.doc == null)
            this.doc = await this.did.resolve();
        else {
            if (this.doc.isCustomizedDid())
                await this.doc.resolveControllers();
        }

        return this.doc;
    }

    public static parse(content: string | JSONObject, context = null): DIDRequest {
        try {
            return DIDEntity.deserialize(content, DIDRequest, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedIDChainRequestException)
                throw e;
            else
                throw new MalformedIDChainRequestException(e);
        }
    }
}
