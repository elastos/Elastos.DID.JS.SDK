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
import type { Comparable } from "./comparable";
import { ComparableMap } from "./comparablemap";
import { Constants } from "./constants";
import {
    AlreadySignedException,
    MalformedTransferTicketException, NoEffectiveControllerException, NotControllerException, NotCustomizedDIDException,
    UnknownInternalException
} from "./exceptions/exceptions";
import type { DIDDocument } from "./internals";
import { checkArgument, DID, DIDEntity, DIDURL, EcdsaSigner } from "./internals";
import { JSONObject } from "./json";
import { VerificationEventListener } from "./verificationEventListener";


/**
 * Transfer ticket class.
 *
 * When customized DID owner(s) transfer the DID ownership to the others,
 * they need create and sign a transfer ticket, it the DID document is mulisig
 * document, the ticket should also multi-signed according the DID document.
 *
 * The new owner(s) can use this ticket create a transfer transaction, get
 * the subject DID's ownership.
 */
export class TransferTicket extends DIDEntity<TransferTicket> {
    private id: DID;
    private to: DID;
    private txid: string;
    private proofs: ComparableMap<DID, TransferTicket.Proof>;

    private doc: DIDDocument;

    public constructor(did: DID = null, to: DID = null, txid: string = null) {
        super();
        this.id = did;
        this.to = to;
        this.txid = txid;
    }

    /**
     * Transfer ticket constructor.
     *
     * @param did the subject did
     * @param to (one of ) the new owner's DID
     * @throws DIDResolveException if failed resolve the subject DID
     */
    public static async newForDIDDocument(target: DIDDocument, to: DID): Promise<TransferTicket> {
        checkArgument(target != null, "Invalid target DID document");
        checkArgument(to != null, "Invalid to DID");

        if (!target.isCustomizedDid())
            throw new NotCustomizedDIDException(target.getSubject().toString() + "isn't a customized did");

        let doc = await target.getSubject().resolve();
        target.getMetadata().setTransactionId(doc.getMetadata().getTransactionId());

        let newTicket = new TransferTicket(target.getSubject(), to, target.getMetadata().getTransactionId());
        newTicket.doc = target;

        return newTicket;
    }

    public static newWithTicket(ticket: TransferTicket, withProof: boolean): TransferTicket {
        let newTicket = new TransferTicket(ticket.id, ticket.to, ticket.txid);
        newTicket.doc = ticket.doc;
        if (withProof) {
            newTicket.proofs = ticket.proofs;
        }
        return newTicket;
    }

    /**
     * Get the subject DID.
     *
     * @return subject DID object
     */
    public getSubject(): DID {
        return this.id;
    }

    /**
     * Get the new owner's DID.
     *
     * @return the new owner's DID object
     */
    public getTo(): DID {
        return this.to;
    }

    /**
     * The reference transaction ID for this transfer operation.
     *
     * @return reference transaction ID string
     */
    public getTransactionId(): string {
        return this.txid;
    }

    /**
     * Get first Proof object.
     *
     * @return the Proof object
     */
    public getProof(): TransferTicket.Proof {
        return this.getProofs()[0];
    }

    /**
     * Get all Proof objects.
     *
     * @return list of the Proof objects
     */
    public getProofs(): TransferTicket.Proof[] {
        return this.proofs.valuesAsSortedArray();
    }

    private async getDocument(): Promise<DIDDocument> {
        if (this.doc == null)
            this.doc = await this.id.resolve();

        return this.doc;
    }
    /**
     * Check whether the ticket is tampered or not.
     *
     * @return true is the ticket is genuine else false
     */
    public async isGenuine(listener: VerificationEventListener = null): Promise<boolean> {
        let doc = await this.getDocument();
        if (doc == null) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: can not resolve the owner document", this.getSubject());
                listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
            }

            return false;
        }

        if (!doc.isGenuine(listener)) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: the owner document is not genuine", this.getSubject());
                listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
            }

            return false;
        }

        // Proofs count should match with multisig
        if ((doc.getControllerCount() > 1 && this.proofs.size != doc.getMultiSignature().m()) ||
            (doc.getControllerCount() <= 1 && this.proofs.size != 1)) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: proof size not matched with multisig, {} expected, actual is {}",
                    this.getSubject(), doc.getMultiSignature().m(), doc.proofs.size);
                listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
            }
            return false;
        }

        let tt = TransferTicket.newWithTicket(this, false);
        let json = tt.serialize(true);
        let digest = EcdsaSigner.sha256Digest(Buffer.from(json, 'utf-8'));

        for (let proof of this.proofs.values()) {
            if (proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
                if (listener != null) {
                    listener.failed(this, "Ticket {}: key type '{}' for proof is not supported",
                        this.getSubject(), proof.getType());
                    listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
                }
                return false;
            }

            let controllerDoc = doc.getControllerDocument(proof.getVerificationMethod().getDid());
            if (controllerDoc == null) {
                if (listener != null) {
                    listener.failed(this, "Ticket {}: can not resolve the document for controller '{}' to verify the proof",
                        this.getSubject(), proof.getVerificationMethod().getDid());
                    listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
                }
                return false;
            }

            if (!await controllerDoc.isValid(listener)) {
                if (listener != null) {
                    listener.failed(this, "Ticket {}: controller '{}' is invalid, failed to verify the proof",
                        this.getSubject(), proof.getVerificationMethod().getDid());
                    listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
                }
                return false;
            }

            if (!proof.getVerificationMethod().equals(controllerDoc.getDefaultPublicKeyId())) {
                if (listener != null) {
                    listener.failed(this, "Ticket {}: key '{}' for proof is not default key of '{}'",
                        this.getSubject(), proof.getVerificationMethod(), proof.getVerificationMethod().getDid());
                    listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
                }
                return false;
            }

            if (!doc.verifyDigest(proof.getVerificationMethod(), proof.getSignature(), digest)) {
                if (listener != null) {
                    listener.failed(this, "Ticket {}: proof '{}' is invalid, signature mismatch",
                        this.getSubject(), proof.getVerificationMethod());
                    listener.failed(this, "Ticket {}: is not genuine", this.getSubject());
                }
                return false;
            }
        }

        if (listener != null)
            listener.succeeded(this, "Ticket {}: is genuine", this.getSubject());

        return true;
    }

    /**
     * Check whether the ticket is genuine and still valid to use.
     *
     * @return true is the ticket is valid else false
     */
    public async isValid(listener: VerificationEventListener = null): Promise<boolean> {
        let doc = await this.getDocument();
        if (doc == null) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: can not resolve the owners document", this.getSubject());
                listener.failed(this, "Ticket {}: is not valid", this.getSubject());
            }
            return false;
        }

        if (!await doc.isValid(listener)) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: the owners document is not valid", this.getSubject());
                listener.failed(this, "Ticket {}: is not valid", this.getSubject());
            }
            return false;
        }

        if (!await this.isGenuine(listener)) {
            if (listener != null)
                listener.failed(this, "Ticket {}: is not valid", this.getSubject());
            return false;
        }

        if (this.txid !== doc.getMetadata().getTransactionId()) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: the transaction id already out date", this.getSubject());
                listener.failed(this, "Ticket {}: is not valid", this.getSubject());
            }
            return false;
        }

        if (listener != null)
            listener.succeeded(this, "Ticket {}: is valid", this.getSubject());

        return true;
    }

    /**
     * Check whether the ticket is qualified.
     * Qualified check will only check the number of signatures meet the
     * requirement.
     *
     * @return true is the ticket is qualified else false
     */
    public async isQualified(): Promise<boolean> {
        if (this.proofs == null || this.proofs.size == 0)
            return false;

        let multisig = (await this.getDocument()).getMultiSignature();
        return this.proofs.size == (multisig == null ? 1 : multisig.m());
    }

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};
        json.id = this.id.toString();
        json.to = this.to.toString();
        json.txid = this.txid;
        if (this.proofs) {
            let proofs = this.proofs.valuesAsSortedArray();
            if (proofs.length == 1)
                json.proof = proofs[0].toJSON(key);
            else
                json.proof = Array.from(proofs, v => v.toJSON(key));
        }

        return json;
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        this.id = this.getDid("id", json.id, { mandatory: true, nullable: false });
        this.to = this.getDid("to", json.to, { mandatory: true, nullable: false });
        this.txid = this.getString("txid", json.txid, { mandatory: true, nullable: false });

        if (!json.proof)
            throw new MalformedTransferTicketException("Missing property: proof");

        this.proofs = new ComparableMap<DID, TransferTicket.Proof>();
        if (!Array.isArray(json.proof)) {
            let po = json.proof as JSONObject;
            let proof = TransferTicket.Proof.deserialize(po, TransferTicket.Proof, this.id);
            if (proof.getVerificationMethod().getDid() == null)
                throw new MalformedTransferTicketException("Invalid verification method: " + proof.getVerificationMethod());

            this.proofs.set(proof.getVerificationMethod().getDid(), proof)
        } else {
            for (let v of json.proof) {
                let po = v as JSONObject;
                let proof = TransferTicket.Proof.deserialize(po, TransferTicket.Proof, this.id);

                if (proof.getVerificationMethod().getDid() == null)
                    throw new MalformedTransferTicketException("Invalid verification method: " + proof.getVerificationMethod());

                if (this.proofs.has(proof.getVerificationMethod().getDid()))
                    throw new MalformedTransferTicketException("Aleady exist proof from " + proof.getVerificationMethod().getDid());

                this.proofs.set(proof.getVerificationMethod().getDid(), proof);

            }
        }
    }

    public async seal(controller: DIDDocument, storepass: string): Promise<void> {
        try {
            if (await this.isQualified())
                return;

            if (controller.isCustomizedDid()) {
                if (controller.getEffectiveController() == null)
                    throw new NoEffectiveControllerException("No effective controller of " + this.getSubject().toString());
            } else {
                try {
                    if (!(await this.getDocument()).hasController(controller.getSubject()))
                        throw new NotControllerException(controller.getSubject().toString() + " isn't the controller");
                } catch (e) {
                    // DIDResolveException
                    // Should never happen
                    throw new UnknownInternalException(e);
                }
            }
        } catch (ignore) {
            // DIDResolveException
            throw new UnknownInternalException(ignore);
        }

        let signKey = controller.getDefaultPublicKeyId();
        if (this.proofs == null) {
            this.proofs = new ComparableMap<DID, TransferTicket.Proof>();
        } else {
            if (this.proofs.has(signKey.getDid()))
                throw new AlreadySignedException(signKey.getDid().toString() + " already signed");
        }

        let tt = TransferTicket.newWithTicket(this, false);
        let json = tt.serialize(true);
        let sig = await controller.signWithStorePass(storepass, Buffer.from(json));
        let proof = new TransferTicket.Proof(signKey, sig);
        this.proofs.set(proof.getVerificationMethod().getDid(), proof);
    }

    /**
     * Parse a TransferTicket object from from a string JSON representation.
     *
     * @param content the string JSON content for building the object.
     * @return the TransferTicket object.
     * @throws DIDSyntaxException if a parse error occurs.
     */
    public static parse(content: string): TransferTicket {
        try {
            return DIDEntity.deserialize(content, TransferTicket);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedTransferTicketException)
                throw e;
            else
                throw new MalformedTransferTicketException(e);
        }
    }
}

/* eslint-disable no-class-assign */
export namespace TransferTicket {
    /**
     * The proof information for DID transfer ticket.
     *
     * The default proof type is ECDSAsecp256r1.
     */
    export class Proof extends DIDEntity<Proof> implements Comparable<Proof> {
        private type: string;
        private created: Date;
        private verificationMethod: DIDURL;
        private signature: string;

        /**
         * Constructs the Proof object with the given values.
         *
         * @param type the verification method type
         * @param method the verification method, normally it's a public key
         * @param signature the signature encoded in base64 URL safe format
         */
        public constructor(method: DIDURL = null, signature: string = null,
            created: Date = new Date(), type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
            super();
            this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
            this.created = created == null ? new Date() : created;
            if (this.created)
                this.created.setMilliseconds(0);
            this.verificationMethod = method;
            this.signature = signature;
        }

        /**
         * Get the verification method type.
         *
         * @return the type string
         */
        public getType(): string {
            return this.type;
        }

        /**
         * Get the verification method, normally it's a public key id.
         *
         * @return the sign key
         */
        public getVerificationMethod(): DIDURL {
            return this.verificationMethod;
        }

        /**
         * Get the created timestamp.
         *
         * @return the created date
         */
        public getCreated(): Date {
            return this.created;
        }

        /**
         * Get the signature.
         *
         * @return the signature encoded in URL safe base64 string
         */
        public getSignature(): string {
            return this.signature;
        }

        public equals(proof: Proof): boolean {
            return this.compareTo(proof) === 0;
        }

        public compareTo(proof: Proof): number {
            let rc = (this.created.getTime() - proof.created.getTime());
            if (rc == 0)
                rc = this.verificationMethod.compareTo(proof.verificationMethod);
            return rc;
        }

        public toJSON(key: string = null): JSONObject {
            let context: DID = key ? new DID(key) : null;

            let json: JSONObject = {};
            if (!context || this.type !== Constants.DEFAULT_PUBLICKEY_TYPE)
                json.type = this.type;
            if (this.created)
                json.created = this.dateToString(this.created);

            json.verificationMethod = this.verificationMethod.toString(context);
            json.signature = this.signature;

            return json;
        }

        protected fromJSON(json: JSONObject, context: DID = null): void {
            this.type = this.getString("proof.type", json.type,
                { mandatory: false, defaultValue: Constants.DEFAULT_PUBLICKEY_TYPE });
            this.created = this.getDate("proof.created", json.created,
                { mandatory: false });
            this.verificationMethod = this.getDidUrl("proof.verificationMethod", json.verificationMethod,
                { mandatory: true, nullable: false, context: context });
            this.signature = this.getString("proof.signature", json.signature,
                { mandatory: true, nullable: false });
        }
    }
}
