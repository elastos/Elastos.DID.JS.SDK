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
import { Constants } from "../constants";
import { IllegalArgumentException, MalformedIDChainRequestException } from "../exceptions/exceptions";
import type { DID, DIDDocument } from "../internals";
import { BASE64, checkArgument, DIDEntity, DIDURL, TransferTicket } from "../internals";
import type { JSONObject } from "../json";


/**
 * The class records the information of IDChain Request.
 */
export abstract class IDChainRequest<T> extends DIDEntity<T> {
    /**
     * The specification string of IDChain DID Request
     */
    public static DID_SPECIFICATION = "elastos/did/1.0";

    /**
     * The specification string of IDChain Credential Request
     */
    public static CREDENTIAL_SPECIFICATION = "elastos/credential/1.0";

    protected header: IDChainRequest.Header;
    protected payload: string;
    protected proof: IDChainRequest.Proof;

    public constructor() {
        super();
    }

    // Called by inheriting constructors
    protected constructWithOperation(operation: IDChainRequest.Operation) {
        this.header = IDChainRequest.Header.newWithPreviousTxId(operation, null);
    }

    protected constructWithPreviousTxId(operation: IDChainRequest.Operation, previousTxid: string) {
        this.header = IDChainRequest.Header.newWithPreviousTxId(operation, previousTxid);
    }

    protected constructWithTransferTicket(operation: IDChainRequest.Operation, ticket: TransferTicket) {
        this.header = IDChainRequest.Header.newWithTransferTicket(operation, ticket);
    }

    protected constructWithIDChainRequest(request: IDChainRequest<unknown>) {
        this.header = request.header;
        this.payload = request.payload;
        this.proof = request.proof;
    }

    protected getHeader(): IDChainRequest.Header {
        return this.header;
    }

    /**
     * Get operation string.
     * @return the operation string
     */
    public getOperation(): IDChainRequest.Operation {
        return this.header.getOperation();
    }

    /**
     * Get payload of IDChain Request.
     *
     * @return the payload string
     */
    public getPayload(): string {
        return this.payload;
    }

    protected setPayload(payload: string) {
        this.payload = payload;
    }

    /**
     * Get the proof object of the IDChainRequest.
     *
     * @return the proof object
     */
    public getProof(): IDChainRequest.Proof {
        return this.proof;
    }

    protected setProof(proof: IDChainRequest.Proof) {
        this.proof = proof;
    }

    protected getSigningInputs(): Buffer[] {
        let prevtxid = this.getOperation().equals(IDChainRequest.Operation.UPDATE) ? this.header.getPreviousTxid() : "";
        let ticket = this.getOperation().equals(IDChainRequest.Operation.TRANSFER) ? this.header.getTicket() : "";

        let inputs: Buffer[] = [
            Buffer.from(this.header.getSpecification()),
            Buffer.from(this.header.getOperation().toString()),
            Buffer.from(prevtxid),
            Buffer.from(ticket),
            Buffer.from(this.payload)
        ];

        return inputs;
    }

    protected abstract getSignerDocument(): Promise<DIDDocument>;

    /**
     * Judge whether the IDChain Request is valid or not.
     *
     * @return the returned value is true if IDChain Request is valid;
     *         the returned value is false if IDChain Request is not valid.
     * @throws DIDTransactionException there is no invalid key.
     * @throws
     */
    public async isValid(): Promise<boolean> {
        let signKey = this.proof.getVerificationMethod();

        let doc = await this.getSignerDocument();
        if (doc == null)
            return false;

        // Here should not check the expiration and deactivated
        if (!doc.isGenuine())
            return false;

        if (!this.getOperation().equals(IDChainRequest.Operation.DEACTIVATE)) {
            if (!doc.isAuthenticationKey(signKey))
                return false;
        } else {
            if (!doc.isAuthenticationKey(signKey) && !doc.isAuthorizationKey(signKey))
                return false;
        }

        return doc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), ...this.getSigningInputs());
    }

    public toJSON(key: string = null): JSONObject {
        return {
            header: this.header.toJSON(),
            payload: this.payload,
            proof: this.proof.toJSON()
        }
    }

    protected fromJSON(json: JSONObject, context = null): void {
        if (!json.header)
            throw new MalformedIDChainRequestException("Missing header");
        this.header = IDChainRequest.Header.parse(json.header as JSONObject);

        if (!json.payload)
            throw new MalformedIDChainRequestException("Missing payload");
        this.payload = this.getString("payload", json.payload, { mandatory: true, nullable: false });

        if (!json.proof)
            throw new MalformedIDChainRequestException("Missing proof");
        this.proof = IDChainRequest.Proof.parse(json.proof as JSONObject);

        this.sanitize();
    }

    protected abstract sanitize(): void;
}

/* eslint-disable no-class-assign */
export namespace IDChainRequest {
    /**
     * The IDChain Request Operation
     */
    export class Operation {
        constructor(private name: string, private specification: string) { }

        public getSpecification(): string {
            return this.specification;
        }

        public toString(): string {
            return this.name;
        }

        public static fromString(name: string): Operation {
            return Operation[name.toUpperCase()];
        }

        public equals(operation: Operation): boolean {
            return this.name === operation.name;
        }
    }

    export namespace Operation {
        /**
         * Create a new DID
         */
        export const CREATE = new Operation("create", IDChainRequest.DID_SPECIFICATION)
        /**
         * Update an exist DID
         */
        export const UPDATE = new Operation("update", IDChainRequest.DID_SPECIFICATION);
        /**
         * Transfer the DID' ownership
         */
        export const TRANSFER = new Operation("transfer", IDChainRequest.DID_SPECIFICATION);
        /**
         * Deactivate a DID
         */
        export const DEACTIVATE = new Operation("deactivate", IDChainRequest.DID_SPECIFICATION);
        /**
         * Declare a credential
         */
        export const DECLARE = new Operation("declare", IDChainRequest.CREDENTIAL_SPECIFICATION);
        /**
         * Revoke a credential
         */
        export const REVOKE = new Operation("revoke", IDChainRequest.CREDENTIAL_SPECIFICATION);
    }

    export class Header extends DIDEntity<Header> {
        private specification: string;
        private operation: Operation;
        private previousTxid: string;
        private ticket: string;

        private transferTicket: TransferTicket;

        constructor(spec: string = null) {
            super();
            this.specification = spec;
        }

        static newWithPreviousTxId(operation: Operation, previousTxid: string) {
            let header = new Header(operation.getSpecification());
            header.operation = operation;
            header.previousTxid = previousTxid;
            return header;
        }

        static newWithTransferTicket(operation: Operation, ticket: TransferTicket) {
            checkArgument(ticket != null, "Invalid ticket");

            let header = new Header(operation.getSpecification());
            header.operation = operation;

            let json = ticket.toString(true);
            header.ticket = BASE64.fromString(json);
            header.transferTicket = ticket;

            return header;
        }

        public getSpecification(): string {
            return this.specification;
        }

        public getOperation(): Operation {
            return this.operation;
        }

        public getPreviousTxid(): string {
            return this.previousTxid;
        }

        public getTicket(): string {
            return this.ticket;
        }

        /*
        private setTicket(ticket: string) {
            checkArgument(ticket != null && ticket !== "", "Invalid ticket");
            this.ticket = ticket;
        }
        */

        public getTransferTicket(): TransferTicket {
            if (this.ticket && !this.transferTicket) {
                let json = BASE64.toString(this.ticket)
                try {
                    this.transferTicket = TransferTicket.parse(json);
                } catch (e) {
                    // MalformedTransferTicketException
                    throw new IllegalArgumentException("Invalid ticket", e);
                }
            }

            return this.transferTicket;
        }

        public toJSON(key: string = null): JSONObject {
            let json: JSONObject = {};

            json.specification = this.specification;
            json.operation = this.operation.toString();
            if (this.previousTxid)
                json.previousTxid = this.previousTxid;
            if (this.ticket)
                json.ticket = this.ticket;

            return json;
        }

        protected fromJSON(json: JSONObject, context = null): void {
            this.specification = this.getString("specification", json.specification, { mandatory: true, nullable: false });
            let op = this.getString("operation", json.operation, { mandatory: true, nullable: false });
            this.operation = Operation.fromString(op);

            this.previousTxid = this.getString("previousTxid", json.previousTxid, { mandatory: false, nullable: false, defaultValue: null });
            this.ticket = this.getString("ticket", json.ticket, { mandatory: false, nullable: false, defaultValue: null });
        }

        public static parse(content: string | JSONObject, context = null): Header {
            try {
                return DIDEntity.deserialize(content, Header, context);
            } catch (e) {
                // DIDSyntaxException
                if (e instanceof MalformedIDChainRequestException)
                    throw e;
                else
                    throw new MalformedIDChainRequestException(e);
            }
        }
    }

    export class Proof extends DIDEntity<Proof> {
        private type: string;
        private verificationMethod: DIDURL;
        private signature: string;

        public constructor(verificationMethod: DIDURL = null, signature: string = null,
            type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
            super();
            this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
            this.verificationMethod = verificationMethod;
            this.signature = signature;
        }

        public getType(): string {
            return this.type;
        }

        public getVerificationMethod(): DIDURL {
            return this.verificationMethod;
        }

        public qualifyVerificationMethod(ref: DID) {
            // TODO: need improve the impl
            if (this.verificationMethod.getDid() == null)
                this.verificationMethod = DIDURL.from(this.verificationMethod, ref);
        }

        public getSignature(): string {
            return this.signature;
        }

        public toJSON(key: string = null): JSONObject {
            return {
                type: this.type,
                verificationMethod: this.verificationMethod.toString(),
                signature: this.signature
            }
        }

        protected fromJSON(json: JSONObject, context = null): void {
            this.type = this.getString("type", json.type, { mandatory: false, defaultValue: Constants.DEFAULT_PUBLICKEY_TYPE, nullable: false });
            this.verificationMethod = this.getDidUrl("verificationMethod", json.verificationMethod, { mandatory: true, nullable: false });
            this.signature = this.getString("signature", json.signature, { mandatory: true, nullable: false });
        }

        public static parse(content: string | JSONObject, context = null): Proof {
            try {
                return DIDEntity.deserialize(content, Proof, context);
            } catch (e) {
                // DIDSyntaxException
                if (e instanceof MalformedIDChainRequestException)
                    throw e;
                else
                    throw new MalformedIDChainRequestException(e);
            }
        }
    }
}