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

import { JsonClassType, JsonCreator, JsonProperty } from "jackson-js";
import type { DIDDocument } from "../internals";
import { DIDURL } from "../internals";
import { base64Decode } from "../internals";
import {
	InvalidKeyException,
	MalformedIDChainRequestException,
	UnknownInternalException
} from "../exceptions/exceptions";
import { VerifiableCredential } from "../internals";
import { IDChainRequest } from "./idchaindrequest";

/**
 * The credential request class.
 */
@JsonCreator()
export class CredentialRequest extends IDChainRequest<CredentialRequest> {
	@JsonProperty({value: IDChainRequest.HEADER})
	@JsonClassType({type: () => [IDChainRequest.Header]})
	declare protected header: IDChainRequest.Header;
	@JsonProperty({value: IDChainRequest.PAYLOAD})
	@JsonClassType({type: () => [String]})
	declare protected payload: string;
	@JsonProperty({value: IDChainRequest.PROOF})
	@JsonClassType({type: () => [IDChainRequest.Proof]})
	declare protected proof: IDChainRequest.Proof;

	private id: DIDURL;
	private vc: VerifiableCredential;
	private signer: DIDDocument;

	public constructor(source: CredentialRequest | IDChainRequest.Operation) {
		super();
		if (source instanceof CredentialRequest) {
			this.constructWithIDChainRequest(source);
		} else {
			this.constructWithOperation(source);
		}
	}

	private static newWithOperation(operation: IDChainRequest.Operation): CredentialRequest {
		let credentialRequest = new CredentialRequest(operation);
		credentialRequest.constructWithOperation(operation);
		return credentialRequest;
	}

	public static newWithCredentialRequest(request: CredentialRequest): CredentialRequest {
		let credentialRequest = new CredentialRequest(request);
		credentialRequest.id = request.id;
		credentialRequest.vc = request.vc;
		credentialRequest.signer = request.signer;
		return credentialRequest;
	}

	/**
	 * Constructs the 'declare' credential Request.
	 *
	 * @param vc the VerifiableCredential object needs to be declare
	 * @param signer the credential owner's DIDDocument object
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach.
	 */
	public static declare(vc: VerifiableCredential, signer: DIDDocument, signKey: DIDURL, storepass: string): CredentialRequest {
		let request = CredentialRequest.newWithOperation(IDChainRequest.Operation.DECLARE);
		request.setPayload(vc);
		request.setSigner(signer);

		try {
			request.seal(signer, signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}

	/**
	 * Constructs the 'revoke' credential Request.
	 *
	 * @param vc the VerifiableCredential object needs to be revoke
	 * @param doc the credential owner's or issuer's DIDDocument object
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach.
	 */
	public static revoke(vc: VerifiableCredential | DIDURL, doc: DIDDocument, signKey: DIDURL, storepass: string): CredentialRequest {
		let request = CredentialRequest.newWithOperation(IDChainRequest.Operation.REVOKE);
		request.setPayload(vc);
		request.setSigner(doc);

		try {
			request.seal(doc, signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}

	private setSigner(initiator: DIDDocument) {
		this.signer = initiator;
	}

	public getCredentialId(): DIDURL {
		return this.id;
	}

	public getCredential(): VerifiableCredential {
		return this.vc;
	}

	 setPayload(id: DIDURL | VerifiableCredential | string) {
		if (id instanceof VerifiableCredential) {
			let vc: VerifiableCredential = id;
			this.id = vc.getId();
			this.vc = vc;

			if (this.getHeader().getOperation().equals(IDChainRequest.Operation.DECLARE)) {
				let json = vc.toString(true);

				this.setPayload(base64Decode(json));
			} else if (this.getHeader().getOperation().equals(IDChainRequest.Operation.REVOKE)) {
				this.setPayload(vc.getId().toString());
			}
		}
		else if (id instanceof DIDURL) {
			this.id = id;
			this.vc = null;

			super.setPayload(id.toString());
		}
		else { // string
			super.setPayload(id);
		}
	}

	public sanitize() {
		let header = this.getHeader();

		if (header == null)
			throw new MalformedIDChainRequestException("Missing header");

		if (header.getSpecification() == null)
			throw new MalformedIDChainRequestException("Missing specification");

		if (header.getSpecification() !== CredentialRequest.CREDENTIAL_SPECIFICATION)
			throw new MalformedIDChainRequestException("Unsupported specification");

		if (!header.getOperation().equals(IDChainRequest.Operation.DECLARE) && !header.getOperation().equals(IDChainRequest.Operation.REVOKE)) {
			throw new MalformedIDChainRequestException("Invalid operation " + header.getOperation());
		}

		let payload = this.getPayload();
		if (payload == null || payload === "")
			throw new MalformedIDChainRequestException("Missing payload");

		let proof = this.getProof();
		if (proof == null)
			throw new MalformedIDChainRequestException("Missing proof");

		try {
			if (header.getOperation().equals(IDChainRequest.Operation.DECLARE)) {
				let json = base64Decode(payload);

				this.vc = VerifiableCredential.parseContent(json);
				this.id = this.vc.getId();
			} else {
				this.id = DIDURL.valueOfUrl(payload);
			}
		} catch (e) {
			// DIDException
			throw new MalformedIDChainRequestException("Invalid payload", e);
		}

		proof.qualifyVerificationMethod(this.id.getDid());
	}

	public seal(doc: DIDDocument, signKey: DIDURL, storepass: string) {
		if (!doc.isAuthenticationKey(signKey))
			throw new InvalidKeyException("Not an authentication key.");

		if (this.getPayload() == null || this.getPayload() === "")
			throw new MalformedIDChainRequestException("Missing payload");

		let signature = doc.signWithId(signKey, storepass, ...this.getSigningInputs());
		this.setProof(new IDChainRequest.Proof(signKey, signature));
	}

	protected async getSignerDocument(): Promise<DIDDocument> {
		if (this.signer != null)
			return this.signer;

		if (this.getOperation().equals(IDChainRequest.Operation.DECLARE))
			this.signer = await this.getCredential().getSubject().getId().resolve();
		else {
			if (this.getCredential() != null)
				this.signer = await this.getCredential().getSubject().getId().resolve();
			else
				this.signer = await this.getProof().getVerificationMethod().getDid().resolve();
		}

		return this.signer;
	}
}
