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

import { Collections } from "./internals";
import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { EcdsaSigner } from "./internals";
import { DID } from "./internals";
import type { DIDDocument } from "./internals";
import { DIDEntity } from "./internals";
import { DIDURL } from "./internals";
import { NotCustomizedDIDException, UnknownInternalException, NotControllerException, NoEffectiveControllerException, AlreadySignedException, MalformedTransferTicketException } from "./exceptions/exceptions";
import { checkArgument } from "./internals";
import { ComparableMap } from "./comparablemap";
import type { JsonStringifierTransformerContext } from "@elastosfoundation/jackson-js";
import { VerificationEventListener } from "./verificationEventListener";
import { FieldInfo, GenericSerializer, FieldType, FilteredTypeSerializer } from "./serializers"

class TransferTicketProofSerializer  {
    public static serialize(normalized: boolean, proofs: TransferTicket.Proof[], instance: any): string {
        if (proofs && proofs.length > 0) {
            if (proofs.length > 1) {
                let jsonProofs = [];
                jsonProofs = proofs.map((proof: TransferTicket.Proof, index: number, array: TransferTicket.Proof[]) => {
                    return proof.serialize(normalized);
                });
                return JSON.stringify(jsonProofs);
            } else {
                return proofs[0].serialize(normalized);
            }
        }
        return null;
    }
    public static deserialize(jsonValue: string, fullJsonObj: any): TransferTicket.Proof[] {
        let jsonObj = JSON.parse(jsonValue);
        if (!(jsonObj instanceof Array)) {
            jsonObj = [jsonObj];
        }
        return jsonObj.map((value: any, index: number, array: any[]) => {
            return TransferTicket.Proof.deserialize(JSON.stringify(value));
        });
    }
}

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
// The values should be the real class field names, not the final JSON output field names.
// Or keep the class field names same with the JSON field namas.
//@JsonPropertyOrder({value:["id", "to", "txid", "_proofs"]})
export class TransferTicket extends DIDEntity<TransferTicket> {
    public static ID = "id";
    public static TO = "to";
    public static TXID = "txid";
    public static PROOF = "proof";
    public static TYPE = "type";
    public static VERIFICATION_METHOD = "verificationMethod";
    public static CREATED = "created";
    public static SIGNATURE = "signature";

    private static FIELDSMAP = new Map<string, FieldInfo>([
        [TransferTicket.ID, FieldInfo.forType(FieldType.TYPE).withTypeName("DID")],
        [TransferTicket.TO, FieldInfo.forType(FieldType.TYPE).withTypeName("DID")],
        [TransferTicket.TXID, FieldInfo.forType(FieldType.LITERAL)],
        [TransferTicket.PROOF, FieldInfo.forType(FieldType.METHOD).withDeserializerMethod(TransferTicketProofSerializer.deserialize).withSerializerMethod(TransferTicketProofSerializer.serialize)]
    ]);

    //@JsonProperty({value:TransferTicket.ID})
    //@JsonClassType({type: () => [DID]})
    private id: DID;

    //@JsonProperty({value:TransferTicket.TO})
    //@JsonClassType({type: () => [DID]})
    private to: DID;

    //@JsonProperty({value:TransferTicket.TXID})
    //@JsonClassType({type: () => [String]})
    private txid: string;

    //@JsonProperty({value:TransferTicket.PROOF})
    //@JsonInclude({value: JsonIncludeType.NON_EMPTY})
    //@JsonSerialize({using: TransferTicketProofSerializer.serialize})
    private _proofs: TransferTicket.Proof[];

    //@JsonIgnore()
    private doc: DIDDocument;

    //@JsonIgnore()
    private proofs: ComparableMap<DID, TransferTicket.Proof>;

    public constructor(did: DID,
            to: DID,
            txid: string) {
        super();
        this.id = did;
        this.to = to;
        this.txid = txid;
    }

    public static createFromValues(fieldValues: Map<string, any>): TransferTicket {
        return new TransferTicket(
            fieldValues[TransferTicket.ID],
            fieldValues[TransferTicket.TO],
            fieldValues[TransferTicket.TXID]
        );
    }

    public getAllValues(): Map<string, any> {
        return new Map<string, any>([
            [TransferTicket.ID, this.getSubject()],
            [TransferTicket.TO, this.getTo()],
            [TransferTicket.TXID, this.getTransactionId()],
            [TransferTicket.PROOF, this.getProofs()]
        ]);
    }

    public serialize(normalized = true): string {
        return GenericSerializer.serialize(normalized, this, TransferTicket.FIELDSMAP);
    }

    public static deserialize(json: string): TransferTicket {
        return GenericSerializer.deserialize(json, TransferTicket, TransferTicket.FIELDSMAP);
    }

    // Add custom deserialization fields to the method params here + assign.
    // Jackson does the rest automatically.
    //@JsonCreator()
    public static jacksonCreator(_proofs?: any) {
        let tt = new TransferTicket(null, null, null);

        // Proofs
        if (_proofs) {
            if (_proofs instanceof Array)
                tt._proofs = _proofs.map((p) => TransferTicket.Proof.deserialize(JSON.stringify(p)));
            else
                tt._proofs = [TransferTicket.Proof.deserialize(JSON.stringify(_proofs))];
        }

        return tt;
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
            throw new NotCustomizedDIDException(target.getSubject().toString());

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
            newTicket._proofs = ticket._proofs;
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
        return this._proofs[0];
    }

    /**
     * Get all Proof objects.
     *
     * @return list of the Proof objects
     */
    public getProofs(): TransferTicket.Proof[] {
        return this._proofs;
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
    public async isGenuine(listener : VerificationEventListener = null): Promise<boolean> {
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

        for (let proof of this._proofs) {
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
                
            if (!controllerDoc.isValid(listener)) {
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
    public async isValid(listener : VerificationEventListener = null): Promise<boolean> {
        let doc = await this.getDocument();
        if (doc == null) {
            if (listener != null) {
                listener.failed(this, "Ticket {}: can not resolve the owners document", this.getSubject());
                listener.failed(this, "Ticket {}: is not valid", this.getSubject());
            }
            return false;
        }

        if (!doc.isValid(listener)) {
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

        let  multisig = (await this.getDocument()).getMultiSignature();
        return this.proofs.size == (multisig == null ? 1 : multisig.m());
    }

    /**
     * Sanitize routine before sealing or after deserialization.
     *
     * @param withProof check the proof object or not
     * @throws MalformedDocumentException if the document object is invalid
     */
    protected sanitize(): Promise<void> {
        if (this._proofs == null || this._proofs.length == 0)
            throw new MalformedTransferTicketException("Missing ticket proof");

        // CAUTION: can not resolve the target document here!
        //          will cause recursive resolve.

        this.proofs = new ComparableMap<DID, TransferTicket.Proof>();

        for (let proof of this._proofs) {
            if (proof.getVerificationMethod() == null) {
                throw new MalformedTransferTicketException("Missing verification method");
            } else {
                if (proof.getVerificationMethod().getDid() == null)
                    throw new MalformedTransferTicketException("Invalid verification method");
            }

            if (this.proofs.has(proof.getVerificationMethod().getDid()))
                throw new MalformedTransferTicketException("Aleady exist proof from " + proof.getVerificationMethod().getDid());

            this.proofs.set(proof.getVerificationMethod().getDid(), proof);
        }

        this._proofs = Array.from(this.proofs).map(([k, v]) => v);
        Collections.sort(this._proofs);

        return null;
    }

    public async seal(controller: DIDDocument, storepass: string): Promise<void> {
        try {
            if (await this.isQualified())
                return;

            if (controller.isCustomizedDid()) {
                if (controller.getEffectiveController() == null)
                    throw new NoEffectiveControllerException(controller.getSubject().toString());
            } else {
                try {
                    if (!(await this.getDocument()).hasController(controller.getSubject()))
                        throw new NotControllerException(controller.getSubject().toString());
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
                throw new AlreadySignedException(signKey.getDid().toString());
        }

        this._proofs = null;

        let tt = TransferTicket.newWithTicket(this, false);
        let json = tt.serialize(true);
        let sig = await controller.signWithStorePass(storepass, Buffer.from(json));
        let proof = TransferTicket.Proof.newWithDIDURL(signKey, sig);
        this.proofs.set(proof.getVerificationMethod().getDid(), proof);

        this._proofs = Array.from(this.proofs).map(([k, v]) => v);
        Collections.sort(this._proofs);
    }

    /**
     * Parse a TransferTicket object from from a string JSON representation.
     *
     * @param content the string JSON content for building the object.
     * @return the TransferTicket object.
     * @throws DIDSyntaxException if a parse error occurs.
     */
    public static async parseContent(content: string): Promise<TransferTicket> {
        try {
            return await DIDEntity.parse<TransferTicket>(content, TransferTicket);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedTransferTicketException)
                throw e;
            else
                throw new MalformedTransferTicketException(e);
        }
    }
}

export namespace TransferTicket {
    /**
     * The proof information for DID transfer ticket.
     *
     * The default proof type is ECDSAsecp256r1.
     */
    //@JsonPropertyOrder({value: ["type", "created", "verificationMethod", "signature"]})
    //@JsonCreator()
    export class Proof implements Comparable<Proof> {
        public static FIELDSMAP = new Map<string, FieldInfo>([
            ["type", FieldInfo.forType(FieldType.LITERAL)],
            ["created", FieldInfo.forType(FieldType.DATE)],
            ["verificationMethod", FieldInfo.forType(FieldType.TYPE).withTypeName("DIDURL")],
            ["signature", FieldInfo.forType(FieldType.LITERAL)]
        ]);

        //@JsonProperty({value: "type"})
        //@JsonClassType({type: () => [String]})
        private type: string;
        //@JsonProperty({value: "created"})
        //@JsonInclude({value: JsonIncludeType.NON_NULL})
        //@JsonClassType({type: () => [Date]})
        private created: Date;
        //@JsonProperty({value: "verificationMethod"})
        //@JsonClassType({type: () => [DIDURL]})
        private verificationMethod: DIDURL;
        //@JsonProperty({value: "signature"})
        //@JsonClassType({type: () => [String]})
        private signature: string;

        /**
         * Constructs the Proof object with the given values.
         *
         * @param type the verification method type
         * @param method the verification method, normally it's a public key
         * @param signature the signature encoded in base64 URL safe format
         */
        /*
        public constructor(
                //@JsonProperty({value: "type"}) type: string,
                //@JsonProperty({value: "verificationMethod", required: true}) method: DIDURL,
                //@JsonProperty({value: "created"}) created: Date,
                //@JsonProperty({value: "signature", required: true}) signature: string
        ) {
            this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
            this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
            if (this.created)
                this.created.setMilliseconds(0);
            this.verificationMethod = method;
            this.signature = signature;
        }
        */

        public static createFromValues(fieldValues: Map<string, any>): TransferTicket.Proof {
            let newInstance = new TransferTicket.Proof();
            newInstance.type = fieldValues["type"];
            newInstance.created = fieldValues["created"];
            newInstance.verificationMethod = fieldValues["verificationMethod"];
            newInstance.signature = fieldValues["signature"];
            return newInstance;
        }
    
        public getAllValues(): Map<string, any> {
            return new Map<string, any>([
                ["type", this.type],
                ["created", this.created],
                ["verificationMethod", this.verificationMethod],
                ["signature", this.signature]
            ]);
        }
    
        public serialize(normalized = true): string {
            return GenericSerializer.serialize(normalized, this, TransferTicket.Proof.FIELDSMAP);
        }
    
        public static deserialize(json: string): TransferTicket.Proof {
            return GenericSerializer.deserialize(json, TransferTicket.Proof, TransferTicket.Proof.FIELDSMAP);
        }

        public static newWithDIDURL(method: DIDURL, signature: string): Proof {
            let proof = new Proof();

            proof.type = Constants.DEFAULT_PUBLICKEY_TYPE;
            proof.verificationMethod = method;
            proof.signature = signature;
            proof.created = new Date();
            proof.created.setMilliseconds(0);

            return proof;
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
    }
}
