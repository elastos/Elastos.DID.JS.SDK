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
import { JsonFormat, JsonInclude, JsonIncludeType, JsonProperty, JsonPropertyOrder } from "jackson-js";
import { Collections } from "./collections";
import { Constants } from "./constants";
import { DID } from "./did";
import { DIDEntity } from "./didentity";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { DIDResolveException, DIDStoreException, DIDNotFoundException, InvalidKeyException, AlreadySealedException, IllegalUsage, DIDObjectAlreadyExistException, MalformedPresentationException } from "./exceptions/exceptions";
import { Proof } from "./transferticket";
import { checkArgument } from "./utils";
import { VerifiableCredential } from "./verifiablecredential";

/**
 * A Presentation can be targeted to a specific verifier by using a Linked Data
 * Proof that includes a nonce and realm.
 *
 * This also helps prevent a verifier from reusing a verifiable presentation as
 * their own.
 */
@JsonPropertyOrder({value: [
	VerifiablePresentation.ID,
	VerifiablePresentation.TYPE,
	VerifiablePresentation.HOLDER,
	VerifiablePresentation.CREATED,
	VerifiablePresentation.VERIFIABLE_CREDENTIAL,
	VerifiablePresentation.PROOF
]})
export class VerifiablePresentation extends DIDEntity<VerifiablePresentation> {
	/**
	 * Default presentation type
	 */
	public static DEFAULT_PRESENTATION_TYPE = "VerifiablePresentation";

	protected static ID = "id";
	protected static TYPE = "type";
	protected static HOLDER = "holder";
	protected static VERIFIABLE_CREDENTIAL = "verifiableCredential";
	protected static CREATED = "created";
	protected static PROOF = "proof";
	protected static NONCE = "nonce";
	protected static REALM = "realm";
	protected static VERIFICATION_METHOD = "verificationMethod";
	protected static SIGNATURE = "signature";

	@JsonProperty({value: VerifiablePresentation.ID})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private id: DIDURL;
	@JsonProperty({value: VerifiablePresentation.TYPE})
	// TODO JAVA: @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY, JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED})
	private type: string[];
	@JsonProperty({value: VerifiablePresentation.HOLDER})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private holder: DID;
	@JsonProperty({value: VerifiablePresentation.CREATED})
	private created: Date;
	@JsonProperty({value: VerifiablePresentation.VERIFIABLE_CREDENTIAL})
	private _credentials: VerifiableCredential[];
	@JsonProperty({value: VerifiablePresentation.PROOF})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private proof: Proof;

	private credentials: Map<DIDURL, VerifiableCredential>;

	/**
	 * Constructs the simplest Presentation.
	 */
	protected VerifiablePresentation(DID holder) {
		this.holder = holder;
		credentials = new TreeMap<DIDURL, VerifiableCredential>();
	}

	protected VerifiablePresentation() {
		this(null);
	}

	/**
	 * Copy constructor.
	 *
	 * @param vp the source VerifiablePresentation object.
	 */
	private VerifiablePresentation(VerifiablePresentation vp, boolean withProof) {
		this.id = vp.id;
		this.type = vp.type;
		this.holder = vp.holder;
		this.created = vp.created;
		this.credentials = vp.credentials;
		this._credentials = vp._credentials;
		if (withProof)
			this.proof = vp.proof;
	}

	public getId(): DIDURL {
		return this.id;
	}

	/**
	 * Get the type of Presentation.
	 *
	 * @return the type string
	 */
	public getType(): ImmutableList<string> {
		return ImmutableList(this.type);
	}

	/**
	 * Get the holder of the Presentation.
	 *
	 * @return the holder's DID
	 */
	public getHolder(): DID {
		// NOTICE:
		//
		// DID 2 SDK should add the holder field as a mandatory field when
		// create the presentation, at the same time should treat the holder
		// field as an optional field when parse the presentation.
		//
		// This will ensure compatibility with the presentations that
		// created by the old SDK.
		return this.holder != null ? this.holder : this.proof.getVerificationMethod().getDid();
	}

	/**
	 * Get the time created Presentation.
	 *
	 * @return the time created
	 */
	public getCreated(): Date {
		return this.created;
	}

	/**
	 * Get the count of Credentials in the Presentation.
	 *
	 * @return the Credentials' count
	 */
	public getCredentialCount(): number {
		return this.credentials.size;
	}

	/**
	 * Get all Credentials in the Presentation.
	 *
	 * @return the Credential array
	 */
	public getCredentials(): ImmutableList<VerifiableCredential> {
		return ImmutableList(this._credentials);
	}

	/**
	 * Get the specified Credential.
	 *
	 * @param id the specified Credential id
	 * @return the Credential object
	 */
	public getCredential(id: DIDURL | string): VerifiableCredential {
		checkArgument(id != null, "Invalid credential id");

		if (typeof id === "string")
			id = DIDURL.valueOf(this.getHolder(), id)
		else if (id.getDid() == null)
			id = DIDURL.valueOf(this.getHolder(), id);

		return this.credentials.get(id);
	}

	/**
	 * Get Presentation Proof object.
	 *
	 * @return the Presentation Proof object
	 */
	public getProof(): Proof {
		return this.proof;
	}

	/**
	 * Sanitize routine before sealing or after deserialization.
	 *
	 * @param withProof check the proof object or not
	 * @throws MalformedPresentationException if the presentation object is invalid
	 */
	protected sanitize() {
		if (this.type == null || this.type.length == 0)
			throw new MalformedPresentationException("Missing presentation type");

		if (this.created == null)
			throw new MalformedPresentationException("Missing presentation create timestamp");

		if (this._credentials != null && this._credentials.length > 0) {
			for (let vc of this._credentials) {
				try {
					vc.sanitize();
				} catch (e) {
					// MalformedCredentialException
					throw new MalformedPresentationException("credential invalid: " + vc.getId(), e);
				}

				if (this.credentials.has(vc.getId()))
					throw new MalformedPresentationException("Duplicated credential id: " + vc.getId());

					this.credentials.set(vc.getId(), vc);
			}
		}

		if (this.proof == null)
			throw new MalformedPresentationException("Missing presentation proof");

		if (this.proof.getVerificationMethod().getDid() == null)
			throw new MalformedPresentationException("Invalid verification method");

		Collections.sort(this.type);
		this._credentials = Array.from(this.credentials.values());
	}

	/**
	 * Check whether the Presentation is genuine or not.
	 *
	 * @return whether the Credential object is genuine
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public isGenuine(): boolean {
		DIDDocument holderDoc = getHolder().resolve();
		if (holderDoc == null)
			return false;

		// Check the integrity of holder' document.
		if (!holderDoc.isGenuine())
			return false;

		// Unsupported public key type;
		if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
			return false;

		// Credential should signed by authentication key.
		if (!holderDoc.isAuthenticationKey(proof.getVerificationMethod()))
			return false;

		// All credentials should owned by holder
		for (VerifiableCredential vc : credentials.values()) {
			if (!vc.getSubject().getId().equals(getHolder()))
				return false;

			if (!vc.isGenuine())
				return false;
		}

		VerifiablePresentation vp = new VerifiablePresentation(this, false);
		String json = vp.serialize(true);

		return holderDoc.verify(proof.getVerificationMethod(),
				proof.getSignature(), json.getBytes(),
				proof.getRealm().getBytes(), proof.getNonce().getBytes());
	}

	/**
	 * Check whether the presentation is genuine or not in asynchronous mode.
	 *
	 * @return the new CompletableStage if success; null otherwise.
	 *         The boolean result is genuine or not
	 */
	public CompletableFuture<Boolean> isGenuineAsync() {
		CompletableFuture<Boolean> future = CompletableFuture.supplyAsync(() -> {
			try {
				return isGenuine();
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	/**
	 * Check whether the presentation is valid or not.
	 *
	 * @return whether the Credential object is valid
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public boolean isValid() throws DIDResolveException {
		DIDDocument holderDoc = getHolder().resolve();
		if (holderDoc == null)
			return false;

		// Check the validity of holder' document.
		if (!holderDoc.isValid())
			return false;

		// Unsupported public key type;
		if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
			return false;

		// Credential should signed by authentication key.
		if (!holderDoc.isAuthenticationKey(proof.getVerificationMethod()))
			return false;

		// All credentials should owned by holder
		for (VerifiableCredential vc : credentials.values()) {
			if (!vc.getSubject().getId().equals(getHolder()))
				return false;

			if (!vc.isValid())
				return false;
		}

		VerifiablePresentation vp = new VerifiablePresentation(this, false);
		String json = vp.serialize(true);

		return holderDoc.verify(proof.getVerificationMethod(),
				proof.getSignature(), json.getBytes(),
				proof.getRealm().getBytes(), proof.getNonce().getBytes());
	}

	/**
	 * Check whether the Credential is valid in asynchronous mode.
	 *
	 * @return the new CompletableStage if success; null otherwise.
	 * 	       The boolean result is valid or not
	 */
	public CompletableFuture<Boolean> isValidAsync() {
		CompletableFuture<Boolean> future = CompletableFuture.supplyAsync(() -> {
			try {
				return isValid();
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	/**
	 * Parse a VerifiablePresentation object from from a string JSON
	 * representation.
	 *
	 * @param content the string JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 */
	public static VerifiablePresentation parse(String content)
			throws MalformedPresentationException {
		try {
			return parse(content, VerifiablePresentation.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedPresentationException)
				throw (MalformedPresentationException)e;
			else
				throw new MalformedPresentationException(e);
		}
	}

	/**
	 * Parse a VerifiablePresentation object from from a Reader object.
	 *
	 * @param src Reader object used to read JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static VerifiablePresentation parse(Reader src)
			throws MalformedPresentationException, IOException {
		try {
			return parse(src, VerifiablePresentation.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedPresentationException)
				throw (MalformedPresentationException)e;
			else
				throw new MalformedPresentationException(e);
		}
	}

	/**
	 * Parse a VerifiablePresentation object from from a InputStream object.
	 *
	 * @param src InputStream object used to read JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static VerifiablePresentation parse(InputStream src)
			throws MalformedPresentationException, IOException {
		try {
			return parse(src, VerifiablePresentation.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedPresentationException)
				throw (MalformedPresentationException)e;
			else
				throw new MalformedPresentationException(e);
		}
	}

	/**
	 * Parse a VerifiablePresentation object from from a File object.
	 *
	 * @param src File object used to read JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static VerifiablePresentation parse(File src)
			throws MalformedPresentationException, IOException {
		try {
			return parse(src, VerifiablePresentation.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedPresentationException)
				throw (MalformedPresentationException)e;
			else
				throw new MalformedPresentationException(e);
		}
	}

	/**
	 * Parse a VerifiablePresentation object from from a string JSON
	 * representation.
	 *
	 * @param content the string JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @deprecated use {@link #parse(String)} instead
	 */
	@Deprecated
	public static VerifiablePresentation fromJson(String content)
			throws MalformedPresentationException {
		return parse(content);
	}

	/**
	 * Parse a VerifiablePresentation object from from a Reader object.
	 *
	 * @param src Reader object used to read JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 * @deprecated use {@link #parse(Reader)} instead
	 */
	@Deprecated
	public static VerifiablePresentation fromJson(Reader src)
			throws MalformedPresentationException, IOException {
		return parse(src);
	}

	/**
	 * Parse a VerifiablePresentation object from from a InputStream object.
	 *
	 * @param src InputStream object used to read JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 * @deprecated use {@link #parse(InputStream)} instead
	 */
	@Deprecated
	public static VerifiablePresentation fromJson(InputStream src)
			throws MalformedPresentationException, IOException {
		return parse(src);
	}

	/**
	 * Parse a VerifiablePresentation object from from a File object.
	 *
	 * @param src File object used to read JSON content for building the object
	 * @return the VerifiablePresentation object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 * @deprecated use {@link #parse(File)} instead
	 */
	@Deprecated
	public static VerifiablePresentation fromJson(File src)
			throws MalformedPresentationException, IOException {
		return parse(src);
	}

	/**
	 * Get the Builder object to create presentation for DID.
	 *
	 * @param did the owner of Presentation.
	 * @param signKey the key to sign
	 * @param store the specified DIDStore
	 * @return the presentation Builder object
	 * @throws DIDStoreException can not load DID
	 * @throws InvalidKeyException if the signKey is invalid
	 */
	public static Builder createFor(DID did, DIDURL signKey, DIDStore store)
			throws DIDStoreException {
		checkArgument(did != null, "Invalid did");
		checkArgument(store != null, "Invalid store");

		DIDDocument holder = store.loadDid(did);
		if (holder == null)
			throw new DIDNotFoundException(did.toString());

		if (signKey == null) {
			signKey = holder.getDefaultPublicKeyId();
		} else {
			if (!holder.isAuthenticationKey(signKey))
				throw new InvalidKeyException(signKey.toString());
		}

		if (!holder.hasPrivateKey(signKey))
			throw new InvalidKeyException("No private key: " + signKey);

		return new Builder(holder, signKey);
	}

	public static Builder createFor(String did, String signKey, DIDStore store)
			throws DIDStoreException {
		return createFor(DID.valueOf(did), DIDURL.valueOf(DID.valueOf(did), signKey), store);
	}

	/**
	 * Get the Builder object to create presentation for DID.
	 *
	 * @param did the owner of the presentation
	 * @param store the specified DIDStore
	 * @return the presentation Builder object
	 * @throws DIDStoreException can not load DID
	 * @throws InvalidKeyException if the signKey is invalid
	 */
	public static Builder createFor(DID did, DIDStore store)
			throws DIDStoreException {
		return createFor(did, null, store);
	}

	public static Builder createFor(String did, DIDStore store)
			throws DIDStoreException {
		return createFor(DID.valueOf(did), null, store);
	}

	/**
     * Presentation Builder object to create presentation.
	 */
	public static class Builder {
		private DIDDocument holder;
		private DIDURL signKey;
		private String realm;
		private String nonce;
		private VerifiablePresentation presentation;

		/**
		 * Create a Builder object with issuer information.
		 *
		 * @param holder the Presentation's holder
		 * @param signKey the key to sign Presentation
		 */
		protected Builder(DIDDocument holder, DIDURL signKey) {
			this.holder = holder;
			this.signKey = signKey;
			this.presentation = new VerifiablePresentation(holder.getSubject());
		}

		private void checkNotSealed() throws AlreadySealedException{
			if (presentation == null)
				throw new AlreadySealedException();
		}

		public Builder id(DIDURL id) {
			checkNotSealed();
			checkArgument(id != null && (id.getDid() == null || id.getDid().equals(holder.getSubject())),
					"Invalid id");

			presentation.id = new DIDURL(holder.getSubject(), id);
			return this;
		}

		public Builder id(String id) {
			return id(DIDURL.valueOf(holder.getSubject(), id));
		}

		/**
		 * Set Credential types.
		 *
		 * @param types the set of types
		 * @return the Builder object
		 */
		public Builder type(String ... types) {
			checkNotSealed();
			checkArgument(types != null && types.length > 0, "Invalid types");

			presentation.type = new ArrayList<String>(Arrays.asList(types));
			return this;
		}

		/**
		 * Add Credentials to Presentation.
		 *
		 * @param credentials the credentials array
		 * @return the Presentation Builder object
		 */
		public Builder credentials(VerifiableCredential ... credentials) {
			checkNotSealed();

			for (VerifiableCredential vc : credentials) {
				if (!vc.getSubject().getId().equals(holder.getSubject()))
					throw new IllegalUsage(vc.getId().toString());

				if (presentation.credentials.containsKey(vc.getId()))
					throw new DIDObjectAlreadyExistException(vc.getId().toString());

				// TODO: integrity check?
				// if (!vc.isValid())
				//	throw new IllegalArgumentException("Credential '" +
				//			vc.getId() + "' is invalid");

				presentation.credentials.put(vc.getId(), vc);
			}

			return this;
		}

		/**
		 * Set realm for Presentation.
		 *
		 * @param realm the realm string
		 * @return the Presentation Builder object
		 */
		public Builder realm(String realm) {
			checkNotSealed();
			checkArgument(realm != null && !realm.isEmpty(), "Invalid realm");

			this.realm = realm;
			return this;
		}

		/**
		 * Set nonce for Presentation.
		 *
		 * @param nonce the nonce string
		 * @return the Presentation Builder object
		 */
		public Builder nonce(String nonce) {
			checkNotSealed();
			checkArgument(nonce != null && !nonce.isEmpty(), "Invalid nonce");

			this.nonce = nonce;
			return this;
		}

		/**
		 * Seal the presentation object, attach the generated proof to the
		 * presentation.
		 *
		 * @param storepass the password for DIDStore
		 * @return the Presentation object
		 * @throws MalformedPresentationException if the presentation is invalid
		 * @throws DIDStoreException if an error occurs when access DID store
		 */
		public VerifiablePresentation seal(String storepass)
				throws MalformedPresentationException, DIDStoreException  {
			checkNotSealed();
			checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

			if (presentation.type == null || presentation.type.isEmpty()) {
				presentation.type = new ArrayList<String>();
				presentation.type.add(DEFAULT_PRESENTATION_TYPE);
			} else {
				Collections.sort(presentation.type);
			}

			Calendar cal = Calendar.getInstance(Constants.UTC);
			presentation.created = cal.getTime();

			presentation._credentials = new ArrayList<VerifiableCredential>(presentation.credentials.values());

			String json = presentation.serialize(true);
			String sig = holder.sign(signKey, storepass, json.getBytes(),
					realm.getBytes(), nonce.getBytes());
			Proof proof = new Proof(signKey, realm, nonce, sig);
			presentation.proof = proof;

			// Invalidate builder
			VerifiablePresentation vp = presentation;
			this.presentation = null;

			return vp;
		}
	}
}

namespace VerifiablePresentation {
	/**
	 * The proof information for verifiable presentation.
	 *
	 * The default proof type is ECDSAsecp256r1.
	 */
	 @JsonPropertyOrder({ TYPE, VERIFICATION_METHOD, REALM, NONCE, SIGNATURE })
	 static public class Proof {
		 @JsonProperty(TYPE)
		 private String type;
		 @JsonProperty(VERIFICATION_METHOD)
		 @JsonSerialize(using = DIDURL.NormalizedSerializer.class)
		 private DIDURL verificationMethod;
		 @JsonProperty(REALM)
		 private String realm;
		 @JsonProperty(NONCE)
		 private String nonce;
		 @JsonProperty(SIGNATURE)
		 private String signature;

		 /**
		  * Create the proof object with the given values.
		  *
		  * @param type the type string
		  * @param method the sign key
		  * @param realm where is presentation use
		  * @param nonce the nonce string
		  * @param signature the signature string
		  */
		 @JsonCreator
		 protected Proof(@JsonProperty(value = TYPE) String type,
				 @JsonProperty(value = VERIFICATION_METHOD, required = true) DIDURL method,
				 @JsonProperty(value = REALM, required = true) String realm,
				 @JsonProperty(value = NONCE, required = true) String nonce,
				 @JsonProperty(value = SIGNATURE, required = true) String signature) {
			 this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
			 this.verificationMethod = method;
			 this.realm = realm;
			 this.nonce = nonce;
			 this.signature = signature;
		 }

		 /**
		  * Create the proof object with the given values.
		  *
		  * @param method the sign key
		  * @param realm where is Presentation use
		  * @param nonce the nonce string
		  * @param signature the signature string
		  */
		 protected Proof(DIDURL method, String realm,
				 String nonce, String signature) {
			 this(Constants.DEFAULT_PUBLICKEY_TYPE, method, realm, nonce, signature);
		 }

		 /**
		  * Get presentation type.
		  *
		  * @return the type string
		  */
		 public String getType() {
			 return type;
		 }

		 /**
		  * Get key to sign Presentation.
		  *
		  * @return the sign key
		  */
		 public DIDURL getVerificationMethod() {
			 return verificationMethod;
		 }

		 /**
		  * Get realm string of Presentation.
		  *
		  * @return the realm string
		  */
		 public String getRealm() {
			 return realm;
		 }

		 /**
		  * Get nonce string of Presentation.
		  *
		  * @return the nonce string
		  */
		 public String getNonce() {
			 return nonce;
		 }

		 /**
		  * Get signature string of Presentation.
		  *
		  * @return the signature string
		  */
		 public String getSignature() {
			 return signature;
		 }
	 }
}