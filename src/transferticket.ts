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

import { JsonPropertyOrder, JsonProperty, JsonFormat, JsonIgnore, JsonInclude, JsonCreator, JsonIncludeType, JsonSerialize } from "jackson-js";
import { Collections, Serializer } from "./internals";
import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { EcdsaSigner } from "./internals";
import type { DID } from "./internals";
import type { DIDDocument } from "./internals";
import { DIDEntity } from "./internals";
import { DIDURL } from "./internals";
import { DIDResolveException, NotCustomizedDIDException, DIDStoreException, UnknownInternalException, NotControllerException, NoEffectiveControllerException, AlreadySignedException, MalformedTransferTicketException } from "./exceptions/exceptions";
import { checkArgument } from "./internals";
import { ComparableMap } from "./comparablemap";
import type { JsonStringifierTransformerContext } from "jackson-js/dist/@types";

class TransferTicketProofSerializer extends Serializer {
	public static serialize(proof: string[], context: JsonStringifierTransformerContext): any {
		return proof.length > 1 ? proof : proof[0];
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
@JsonPropertyOrder({value:["id", "to", "txid", "_proofs"]})
export class TransferTicket extends DIDEntity<TransferTicket> {
	public static ID = "id";
	public static TO = "to";
	public static TXID = "txid";
	public static PROOF = "proof";
	public static TYPE = "type";
	public static VERIFICATION_METHOD = "verificationMethod";
	public static CREATED = "created";
	public static SIGNATURE = "signature";

	@JsonProperty({value:TransferTicket.ID})
	private id: DID;

	@JsonIgnore()
	private doc: DIDDocument;

	@JsonProperty({value:TransferTicket.TO})
	private to: DID;

	@JsonProperty({value:TransferTicket.TXID})
	private txid: string;

	@JsonProperty({value:TransferTicket.PROOF})
	@JsonInclude({value: JsonIncludeType.NON_EMPTY})
	@JsonSerialize({using: TransferTicketProofSerializer.serialize})
	private _proofs: Proof[];

	private proofs: ComparableMap<DID, Proof>;

	public constructor(@JsonProperty({value: TransferTicket.ID, required:true}) did: DID,
			@JsonProperty({value: TransferTicket.TO, required: true}) to: DID,
			@JsonProperty({value: TransferTicket.TXID, required: true}) txid: string) {
		super();
		this.id = did;
		this.to = to;
		this.txid = txid;
	}

	// Add custom deserialization fields to the method params here + assign.
    // Jackson does the rest automatically.
    @JsonCreator()
    public static jacksonCreator(@JsonProperty({value: TransferTicket.PROOF}) proof?: any) {
        let tt = new TransferTicket(null, null, null);

        // Proofs
        if (proof) {
            if (proof instanceof Array)
				tt._proofs = proof.map((p) => TransferTicket.getDefaultObjectMapper().parse(JSON.stringify(p), {mainCreator: () => [Proof]}));
            else
				tt._proofs = [TransferTicket.getDefaultObjectMapper().parse(JSON.stringify(proof), {mainCreator: () => [Proof]})];
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
	public getProof(): Proof {
		return this._proofs[0];
	}

	/**
	 * Get all Proof objects.
	 *
	 * @return list of the Proof objects
	 */
	public getProofs(): Proof[] {
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
	public async isGenuine(): Promise<boolean> {
		let doc = await this.getDocument();
		if (doc == null)
			return false;

		if (!doc.isGenuine())
			return false;

		// Proofs count should match with multisig
		if ((doc.getControllerCount() > 1 && this.proofs.size != doc.getMultiSignature().m()) ||
				(doc.getControllerCount() <= 1 && this.proofs.size != 1))
			return false;

		let tt = TransferTicket.newWithTicket(this, false);
		let json = tt.serialize(true);
		let digest = EcdsaSigner.sha256Digest(Buffer.from(json, 'utf-8'));

		let checkedControllers: DID[] = [];

		for (let proof of this._proofs) {
			if (proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE)
				return false;

			let controllerDoc = doc.getControllerDocument(proof.getVerificationMethod().getDid());
			if (controllerDoc == null)
				return false;

			if (!controllerDoc.isValid())
				return false;

			// if already checked this controller
			if (checkedControllers.includes(proof.getVerificationMethod().getDid()))
				return false;

			if (!proof.getVerificationMethod().equals(controllerDoc.getDefaultPublicKeyId()))
				return false;

			if (!doc.verifyDigest(proof.getVerificationMethod(), proof.getSignature(), digest))
				return false;

			checkedControllers.push(proof.getVerificationMethod().getDid());
		}

		return true;
	}

	/**
	 * Check whether the ticket is genuine and still valid to use.
	 *
	 * @return true is the ticket is valid else false
	 */
	public async isValid(): Promise<boolean> {
		let doc = await this.getDocument();
		if (doc == null)
			return false;

		if (!doc.isValid())
			return false;

		if (!await this.isGenuine())
			return false;

		if (this.txid !== doc.getMetadata().getTransactionId())
			return false;

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

		this.proofs = new ComparableMap<DID, Proof>();

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
			this.proofs = new ComparableMap<DID, Proof>();
		} else {
			if (this.proofs.has(signKey.getDid()))
				throw new AlreadySignedException(signKey.getDid().toString());
		}

		this._proofs = null;

		let json = this.serialize(true);
		let sig = await controller.signWithStorePass(storepass, Buffer.from(json));
		let proof = Proof.newWithDIDURL(signKey, sig);
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

/**
 * The proof information for DID transfer ticket.
 *
 * The default proof type is ECDSAsecp256r1.
 */
 @JsonPropertyOrder({value: ["type", "created", "verificationMethod", "signature"]})
 @JsonCreator()
 export class Proof implements Comparable<Proof> {
	 @JsonProperty({value: TransferTicket.TYPE})
	 private type: string;
	 @JsonProperty({value: TransferTicket.CREATED})
	 @JsonInclude({value: JsonIncludeType.NON_NULL})
	 private created: Date;
	 @JsonProperty({value: TransferTicket.VERIFICATION_METHOD})
	 private verificationMethod: DIDURL;
	 @JsonProperty({value: TransferTicket.SIGNATURE})
	 private signature: string;

	 /**
	  * Constructs the Proof object with the given values.
	  *
	  * @param type the verification method type
	  * @param method the verification method, normally it's a public key
	  * @param signature the signature encoded in base64 URL safe format
	  */
	 public constructor(
		 	@JsonProperty({value: TransferTicket.TYPE}) type: string,
			@JsonProperty({value: TransferTicket.VERIFICATION_METHOD, required: true}) method: DIDURL,
		 	@JsonProperty({value: TransferTicket.CREATED}) created: Date,
			@JsonProperty({value: TransferTicket.SIGNATURE, required: true}) signature: string
	 ) {
		 this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
		 this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
		 this.verificationMethod = method;
		 this.signature = signature;
	 }

	 public static newWithDIDURL(method: DIDURL, signature: string): Proof {
		 let proof = new Proof(
			Constants.DEFAULT_PUBLICKEY_TYPE,
			method,
			new Date(),
			signature);

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