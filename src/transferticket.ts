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
import { JsonPropertyOrder, JsonProperty, JsonFormat, JsonInclude, JsonCreator, JsonIncludeType } from "jackson-js";
import { Collections } from "./collections";
import { Comparable } from "./comparable";
import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDEntity } from "./didentity";
import { DIDURL } from "./didurl";
import { DIDResolveException, NotCustomizedDIDException, DIDStoreException, UnknownInternalException, NotControllerException, NoEffectiveControllerException, AlreadySignedException, MalformedTransferTicketException } from "./exceptions/exceptions";
import { checkArgument } from "./utils";

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
@JsonPropertyOrder({value:[TransferTicket.ID, TransferTicket.TO, TransferTicket.TXID, TransferTicket.PROOF]})
export class TransferTicket extends DIDEntity<TransferTicket> {
	public /*protected*/ static ID = "id";
	public /*protected*/ static TO = "to";
	public /*protected*/ static TXID = "txid";
	public /*protected*/ static PROOF = "proof";
	public /*protected*/ static TYPE = "type";
	public /*protected*/ static VERIFICATION_METHOD = "verificationMethod";
	public /*protected*/ static CREATED = "created";
	public /*protected*/ static SIGNATURE = "signature";

	@JsonProperty({value:TransferTicket.ID})
	private id: DID;
	private doc: DIDDocument;

	@JsonProperty({value:TransferTicket.TO})
	private to: DID;

	@JsonProperty({value:TransferTicket.TXID})
	private txid: string;

	@JsonProperty({value:TransferTicket.PROOF})
	@JsonInclude({value: JsonIncludeType.NON_EMPTY})
	// TODO - Convert from java - @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED})
	private _proofs: Proof[];

	private proofs: Map<DID, Proof>;

	/**
	 * Transfer ticket constructor.
	 *
	 * @param did the subject did
	 * @param to (one of ) the new owner's DID
	 * @throws DIDResolveException if failed resolve the subject DID
	 */
	protected constructor(target: DIDDocument, to: DID) {
		super();
		checkArgument(target != null, "Invalid target DID document");
		checkArgument(to != null, "Invalid to DID");

		if (!target.isCustomizedDid())
			throw new NotCustomizedDIDException(target.getSubject().toString());

		target.getMetadata().setTransactionId(target.getSubject().resolve().getMetadata().getTransactionId());

		this.id = target.getSubject();
		this.doc = target;

		this.to = to;
		this.txid = target.getMetadata().getTransactionId();
	}

	@JsonCreator
	protected constructor(@JsonProperty({value: TransferTicket.ID, required:true}) did: DID,
			@JsonProperty({value: TransferTicket.TO, required: true}) to: DID,
			@JsonProperty({value: TransferTicket.TXID, required: true}) txid: string) {
		super();
		this.id = did;
		this.to = to;
		this.txid = txid;
	}

	private constructor(ticket: TransferTicket, withProof: boolean) {
		super();
		this.id = ticket.id;
		this.to = ticket.to;
		this.txid = ticket.txid;
		this.doc = ticket.doc;
		if (withProof) {
			this.proofs = ticket.proofs;
			this._proofs = ticket._proofs;
		}
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
	public getProofs(): ImmutableList<Proof> {
		return Collections.unmodifiableList(this._proofs);
	}

	private getDocument(): DIDDocument {
		if (this.doc == null)
			this.doc = this.id.resolve();

		return this.doc;
	}
	/**
	 * Check whether the ticket is tampered or not.
	 *
	 * @return true is the ticket is genuine else false
	 */
	public isGenuine(): boolean {
		let doc = this.getDocument();
		if (doc == null)
			return false;

		if (!doc.isGenuine())
			return false;

		// Proofs count should match with multisig
		if ((doc.getControllerCount() > 1 && this.proofs.size != doc.getMultiSignature().m()) ||
				(doc.getControllerCount() <= 1 && this.proofs.size != 1))
			return false;

		let tt = new TransferTicket(this, false);
		let json = tt.serialize(true);
		let digest = EcdsaSigner.sha256Digest(json.getBytes());

		let checkedControllers = new ArrayList<DID>(this._proofs.size());

		for (let proof of this._proofs) {
			if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
				return false;

			let controllerDoc = doc.getControllerDocument(proof.getVerificationMethod().getDid());
			if (controllerDoc == null)
				return false;

			if (!controllerDoc.isValid())
				return false;

			// if already checked this controller
			if (checkedControllers.contains(proof.getVerificationMethod().getDid()))
				return false;

			if (!proof.getVerificationMethod().equals(controllerDoc.getDefaultPublicKeyId()))
				return false;

			if (!doc.verifyDigest(proof.getVerificationMethod(), proof.getSignature(), digest))
				return false;

			checkedControllers.add(proof.getVerificationMethod().getDid());
		}

		return true;
	}

	/**
	 * Check whether the ticket is genuine and still valid to use.
	 *
	 * @return true is the ticket is valid else false
	 */
	public isValid(): boolean {
		let doc = this.getDocument();
		if (doc == null)
			return false;

		if (!doc.isValid())
			return false;

		if (!this.isGenuine())
			return false;

		if (!this.txid === doc.getMetadata().getTransactionId())
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
	public isQualified(): boolean {
		if (this.proofs == null || this.proofs.size == 0)
			return false;

		let  multisig = this.getDocument().getMultiSignature();
		return this.proofs.size == (multisig == null ? 1 : multisig.m());
	}

	/**
	 * Sanitize routine before sealing or after deserialization.
	 *
	 * @param withProof check the proof object or not
	 * @throws MalformedDocumentException if the document object is invalid
	 */
	protected sanitize() {
		if (this._proofs == null || this._proofs.length == 0)
			throw new MalformedTransferTicketException("Missing ticket proof");

		// CAUTION: can not resolve the target document here!
		//          will cause recursive resolve.

		this.proofs = new Map<DID, Proof>();

		for (let proof of this._proofs) {
			if (proof.getVerificationMethod() == null) {
				throw new MalformedTransferTicketException("Missing verification method");
			} else {
				if (proof.getVerificationMethod().getDid() == null)
					throw new MalformedTransferTicketException("Invalid verification method");
			}

			if (proofs.containsKey(proof.getVerificationMethod().getDid()))
				throw new MalformedTransferTicketException("Aleady exist proof from " + proof.getVerificationMethod().getDid());

			proofs.put(proof.getVerificationMethod().getDid(), proof);
		}

		this._proofs = new ArrayList<Proof>(this.proofs.values());
		Collections.sort(this._proofs);
	}

	protected seal(controller: DIDDocument, storepass: string) {
		try {
			if (this.isQualified())
				return;

			if (controller.isCustomizedDid()) {
				if (controller.getEffectiveController() == null)
					throw new NoEffectiveControllerException(controller.getSubject().toString());
			} else {
				try {
					if (!this.getDocument().hasController(controller.getSubject()))
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
			this.proofs = new Map<DID, Proof>();
		} else {
			if (this.proofs.has(signKey.getDid()))
				throw new AlreadySignedException(signKey.getDid().toString());
		}

		this._proofs = null;

		let json = this.serialize(true);
		let sig = controller.sign(storepass, json.getBytes());
		let proof = new Proof(signKey, sig);
		this.proofs.set(proof.getVerificationMethod().getDid(), proof);

		this._proofs = new ArrayList<Proof>(this.proofs.values());
		Collections.sort(this._proofs);
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
			return parse(content, TransferTicket.class);
		} catch (e) {
			// DIDSyntaxException
			if (e instanceof MalformedTransferTicketException)
				throw e;
			else
				throw new MalformedTransferTicketException(e);
		}
	}

	/**
	 * Parse a TransferTicket object from from a Reader object.
	 *
	 * @param src Reader object used to read JSON content for building the object
	 * @return the TransferTicket object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static parse(src: Reader): TransferTicket {
		try {
			return parse(src, TransferTicket.class);
		} catch (e) {
			// DIDSyntaxException
			if (e instanceof MalformedTransferTicketException)
				throw e;
			else
				throw new MalformedTransferTicketException(e);
		}
	}

	/**
	 * Parse a TransferTicket object from from a InputStream object.
	 *
	 * @param src InputStream object used to read JSON content for building the object
	 * @return the TransferTicket object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static parse(src: InputStream): TransferTicket {
		try {
			return parse(src, TransferTicket.class);
		} catch (e) {
			// DIDSyntaxException
			if (e instanceof MalformedTransferTicketException)
				throw e;
			else
				throw new MalformedTransferTicketException(e);
		}
	}

	/**
	 * Parse a TransferTicket object from from a File object.
	 *
	 * @param src File object used to read JSON content for building the object
	 * @return the TransferTicket object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static parse(src: File): TransferTicket {
		try {
			return parse(src, TransferTicket.class);
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
	 @JsonPropertyOrder({value: [TransferTicket.TYPE, TransferTicket.CREATED, TransferTicket.VERIFICATION_METHOD, TransferTicket.SIGNATURE]})
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
		 @JsonCreator
		 protected constructor(@JsonProperty({value: TYPE}) type: string,
				 @JsonProperty({value: VERIFICATION_METHOD, required: true}) method: DIDURL,
				 @JsonProperty({value: CREATED}) created: Date,
				 @JsonProperty({value: SIGNATURE}, required = true) signature: string) {
			 this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
			 this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
			 this.verificationMethod = method;
			 this.signature = signature;
		 }

		 protected constructor(method: DIDURL, signature: string) {
			 this(Constants.DEFAULT_PUBLICKEY_TYPE, method,
					 Calendar.getInstance(Constants.UTC).getTime(), signature);
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

		 public compareTo(proof: Proof): number {
			 let rc = (int)(this.created.getTime() - proof.created.getTime());
			 if (rc == 0)
				 rc = this.verificationMethod.compareTo(proof.verificationMethod);
			 return rc;
		 }
	 }
}