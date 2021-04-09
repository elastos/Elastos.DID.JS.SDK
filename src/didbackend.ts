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

import { CredentialRequest } from "./backend/credentialrequest";
import { CredentialTransaction } from "./backend/credentialtransaction";
import { DIDBiography } from "./backend/didbiography";
import { DIDRequest } from "./backend/didrequest";
import { DIDResolveRequest } from "./backend/didresolverequest";
import { DIDTransaction } from "./backend/didtransaction";
import { IDChainRequest, Operation } from "./backend/idchaindrequest";
import { ResolveRequest } from "./backend/resolverequest";
import { ResolveResult } from "./backend/resolveresult";
import { CredentialMetadata } from "./credentialmetadata";
import { DID } from "./did";
import { DIDAdapter } from "./didadapter";
import { DIDDocument } from "./diddocument";
import { DIDMetadata } from "./didmetadata";
import { DIDTransactionAdapter } from "./didtransactionadapter";
import { DIDURL } from "./didurl";
import { DIDResolveException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { LRUCache } from "./lrucache";
import { TransferTicket } from "./transferticket";
import { checkArgument } from "./utils";
import { VerifiableCredential } from "./verifiablecredential";

const log = new Logger("DIDBackend");

/**
 * The interface to indicate how to get local did document, if this did is not published to chain.
 */
interface LocalResolveHandle {
	/**
	 * Resolve DID content(DIDDocument).
	 *
	 * @param did the DID object
	 * @return DIDDocument object
	 */
	resolve(did: DID): DIDDocument;
}

/**
 * The class is to provide the backend for resolving DID.
 */
export class DIDBackend {
	private static DEFAULT_CACHE_INITIAL_CAPACITY = 16;
	private static DEFAULT_CACHE_MAX_CAPACITY = 64;
	private static DEFAULT_CACHE_TTL = 10 * 60 * 1000;

	private static random: Random = new Random();

	private adapter: DIDAdapter;
	private resolveHandle: LocalResolveHandle;

	private cache: LRUCache<ResolveRequest<any, any>, ResolveResult<any>>;

	private static instance: DIDBackend;

	/**
	 * Create a DIDBackend with the adapter and the cache specification.
     *
     * @param adapter the DIDAdapter object
     * @param initialCacheCapacity the initial cache size, 0 for default size
     * @param maxCacheCapacity the maximum cache capacity, 0 for default capacity
     * @param int cacheTtl the live time for the cached entries, 0 for default
     */
	private constructor(adapter: DIDAdapter, initialCacheCapacity: number, maxCacheCapacity: number, cacheTtl: number) {
		if (initialCacheCapacity < 0)
			initialCacheCapacity = 0;

		if (maxCacheCapacity < 0)
			maxCacheCapacity = 0;

		if (cacheTtl < 0)
			cacheTtl = 0;

		this.adapter = adapter;

		/* TODO let loader: CacheLoader<ResolveRequest<?, ?>, ResolveResult<?>>;
		loader = new CacheLoader<ResolveRequest<?, ?>, ResolveResult<?>>() {
			public ResolveResult<?> load(ResolveRequest<?, ?> key) {
				log.trace("Cache loading {}...", key);
				return resolve(key);
			}
		}; */

		this.cache = new LRUCache({
			maxItems: maxCacheCapacity,
      		maxAge: cacheTtl/1000 //TimeUnit.MILLISECONDS,
		});

		log.info("DID backend initialized, cache(init:{}, max:{}, ttl:{})",
				initialCacheCapacity, maxCacheCapacity, cacheTtl / 1000);
	}

    /**
	 * Initialize the DIDBackend with the adapter and the cache specification.
     *
     * @param adapter the DIDAdapter object
     * @param initialCacheCapacity the initial cache size, 0 for default size
     * @param maxCacheCapacity the maximum cache capacity, 0 for default capacity
     * @param int cacheTtl the live time for the cached entries, 0 for default
     */
	public static initialize(
		adapter: DIDAdapter,
		initialCacheCapacity: number = DIDBackend.DEFAULT_CACHE_MAX_CAPACITY,
		maxCacheCapacity: number = DIDBackend.DEFAULT_CACHE_INITIAL_CAPACITY,
		cacheTtl: number = DIDBackend.DEFAULT_CACHE_TTL
	) {
		checkArgument(adapter != null, "Invalid adapter");
		checkArgument(initialCacheCapacity <= maxCacheCapacity, "Invalid cache capacity");

		initialCacheCapacity = initialCacheCapacity < maxCacheCapacity ?
				initialCacheCapacity : maxCacheCapacity;

		this.instance = new DIDBackend(adapter, initialCacheCapacity,
				maxCacheCapacity, cacheTtl);
	}

	/**
	 * Get DIDBackend instance according to specified DIDAdapter object.
	 *
	 * @return the DIDBackend instance
	 */
	public static getInstance(): DIDBackend {
		return this.instance;
	}

	private generateRequestId(): string {
		byte[] bin = new byte[16];
	    random.nextBytes(bin);
	    return Hex.toHexString(bin);
	}

	/**
	 * Get DIDAdapter object.
	 *
	 * @return the DIDAdapter object from DIDBackend.
	 */
	private getAdapter(): DIDAdapter {
		return this.adapter;
	}

	/**
     * Set DID Local Resolve handle in order to give the method handle which did document to verify.
     * If handle != NULL, set DID Local Resolve Handle; If handle == NULL, clear this handle.
     *
	 * @param handle the ResolveHandle object
	 */
	public setResolveHandle(handle: LocalResolveHandle) {
		this.resolveHandle = handle;
	}

	private resolve(request: ResolveRequest<?, ?>): ResolveResult<?> {
		log.debug("Resolving request {}...", request);

		let requestJson = request.serialize(true);
		let is: InputStream = this.getAdapter().resolve(requestJson);

		let response: ResolveResponse<?, ?>  = null;
		try {
			switch (request.getMethod()) {
			case DIDResolveRequest.METHOD_NAME:
				response = DIDResolveResponse.parse(is, DIDResolveResponse.class);
				break;

			case CredentialResolveRequest.METHOD_NAME:
				response = CredentialResolveResponse.parse(is, CredentialResolveResponse.class);
				break;

			case CredentialListRequest.METHOD_NAME:
				response = CredentialListResponse.parse(is, CredentialListResponse.class);
				break;

			default:
				log.error("INTERNAL - unknown resolve method '{}'", request.getMethod());
				throw new DIDResolveException("Unknown resolve method: " + request.getMethod());
			}
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDResolveException(e);
		} finally {
			try {
				is.close();
			} catch (ignore) {
				// IOException
			}
		}

		if (response.getResponseId() == null ||
				!response.getResponseId().equals(request.getRequestId()))
			throw new DIDResolveException("Mismatched resolve result with request.");

		if (response.getResult() != null)
			return response.getResult();
		else
			throw new DIDResolveException("Server error(" + response.getErrorCode()
					+ "): " + response.getErrorMessage());
	}

	private resolveDidBiography(did: DID, all: boolean= true, force: boolean = false): DIDBiography {
		log.info("Resolving DID {}, all={}...", did.toString(), all);

		let request = new DIDResolveRequest(this.generateRequestId());
		request.setParameters(did, all);

		if (force)
			this.cache.invalidate(request);

		try {
			return this.cache.get(request) as DIDBiography;
		} catch (e) {
			// ExecutionException
			throw new DIDResolveException(e);
		}
	}

	/**
	 * Resolve DID content(DIDDocument).
	 *
	 * @param did the DID object
	 * @param force force = true, DID content must be from chain.
	 *              force = false, DID content could be from chain or local cache.
	 * @return the DIDDocument object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	protected resolveDid(did: DID, force: boolean = false): DIDDocument {
		log.debug("Resolving DID {}...", did.toString());

		if (this.resolveHandle != null) {
			let doc = this.resolveHandle.resolve(did);
			if (doc != null)
				return doc;
		}

		let bio = this.resolveDidBiography(did, false, force);

		let tx: DIDTransaction = null;
		switch (bio.getStatus()) {
		case VALID:
			tx = bio.getTransaction(0);
			break;

		case DEACTIVATED:
			if (bio.getTransactionCount() != 2)
				throw new DIDResolveException("Invalid DID biography, wrong transaction count.");

			tx = bio.getTransaction(0);
			if (!tx.getRequest().getOperation().equals(Operation.DEACTIVATE))
				throw new DIDResolveException("Invalid DID biography, wrong status.");

			let doc = bio.getTransaction(1).getRequest().getDocument();
			if (doc == null)
				throw new DIDResolveException("Invalid DID biography, invalid trancations.");

			// Avoid resolve current DID recursively
			let request = new DIDRequest(tx.getRequest(), {
				getSignerDocument() {
					return this.getDocument() == null ? doc : this.getDocument();
				}
			});

			if (!request.isValid())
				throw new DIDResolveException("Invalid DID biography, transaction signature mismatch.");

			tx = bio.getTransaction(1);
			break;

		case NOT_FOUND:
			return null;
		}

		if (!tx.getRequest().getOperation().equals(Operation.CREATE) &&
			!tx.getRequest().getOperation().equals(Operation.UPDATE) &&
			!tx.getRequest().getOperation().equals(Operation.TRANSFER))
			throw new DIDResolveException("Invalid ID transaction, unknown operation.");

		if (!tx.getRequest().isValid())
			throw new DIDResolveException("Invalid ID transaction, signature mismatch.");

		let doc = tx.getRequest().getDocument();
		let metadata = new DIDMetadata(doc.getSubject());
		metadata.setTransactionId(tx.getTransactionId());
		metadata.setSignature(doc.getProof().getSignature());
		metadata.setPublished(tx.getTimestamp());
		if (bio.getStatus() == DIDBiography.Status.DEACTIVATED)
			metadata.setDeactivated(true);
		doc.setMetadata(metadata);
		return doc;
	}

	public /* private */ resolveCredentialBiography(id: DIDURL, issuer: DID = null, force: boolean = false): CredentialBiography {
		log.info("Resolving credential {}, issuer={}...", id, issuer);

		let request = new CredentialResolveRequest(this.generateRequestId());
		request.setParameters(id, issuer);

		if (force)
			this.cache.invalidate(request);

		try {
			return this.cache.get(request);
		} catch (e) {
			// ExecutionException
			throw new DIDResolveException(e);
		}
	}

	protected resolveCredential(id: DIDURL, issuer: DID = null, force: boolean= false): VerifiableCredential {
		log.debug("Resolving credential {}...", id);

		let bio = this.resolveCredentialBiography(id, issuer, force);

		let tx: CredentialTransaction = null;
		switch (bio.getStatus()) {
		case VALID:
			tx = bio.getTransaction(0);
			break;

		case REVOKED:
			tx = bio.getTransaction(0);
			if (!tx.getRequest().getOperation().equals(Operation.REVOKE))
				throw new DIDResolveException("Invalid credential biography, wrong status.");

			if (bio.getTransactionCount() < 1 || bio.getTransactionCount() > 2)
				throw new DIDResolveException("Invalid credential biography, transaction signature mismatch.");


			if (bio.getTransactionCount() == 1) {
				if (!tx.getRequest().isValid())
					throw new DIDResolveException("Invalid credential biography, transaction signature mismatch.");

				return null;
			} else {
				let vc = bio.getTransaction(1).getRequest().getCredential();

				// Avoid resolve current credential recursively
				let request = new CredentialRequest(tx.getRequest(), {
					getCredential() {
						return vc;
					}
				});

				if (!request.isValid())
					throw new DIDResolveException("Invalid credential biography, transaction signature mismatch.");
			}

			tx = bio.getTransaction(1);
			break;

		case NOT_FOUND:
			return null;
		}

		if (!tx.getRequest().getOperation().equals(Operation.DECLARE))
			throw new DIDResolveException("Invalid credential transaction, unknown operation.");

		if (!tx.getRequest().isValid())
			throw new DIDResolveException("Invalid credential transaction, signature mismatch.");

		let vc = tx.getRequest().getCredential();
		let metadata = new CredentialMetadata(vc.getId());
		metadata.setTransactionId(tx.getTransactionId());
		metadata.setPublished(tx.getTimestamp());
		if (bio.getStatus() == CredentialBiography.Status.REVOKED)
			metadata.setRevoked(true);
		vc.setMetadata(metadata);
		return vc;
	}

	protected listCredentials(did: DID, skip: number, limit: number): DIDURL[] {
		log.info("List credentials for {}", did);

		let request = new CredentialListRequest(this.generateRequestId());
		request.setParameters(did, skip, limit);

		let list = this.resolve(request) as CredentialList;
		if (list == null || list.size() == 0)
			return null;

		return list.getCredentialIds();
	}

	private createTransaction(request: IDChainRequest<?>, adapter: DIDTransactionAdapter) {
		log.info("Create ID transaction...");

		let payload = request.serialize(true);
		log.trace("Transaction payload: '{}', memo: {}", payload, "");

		if (adapter == null)
			adapter = this.getAdapter();

		adapter.createIdTransaction(payload, payload);

		log.info("ID transaction complete.");
	}

	private invalidDidCache(did: DID) {
		let request = new DIDResolveRequest(this.generateRequestId());
		request.setParameters(did, true);
		this.cache.invalidate(request);

		request.setParameters(did, false);
		this.cache.invalidate(request);
	}

	private invalidCredentialCache(id: DIDURL, signer: DID) {
		let request = new CredentialResolveRequest(generateRequestId());
		request.setParameters(id, signer);
		this.cache.invalidate(request);

		if (signer != null) {
			request.setParameters(id, null);
			this.cache.invalidate(request);
		}
	}

	public clearCache() {
		this.cache.invalidateAll();
	}

	/**
	 * Publish 'create' id transaction for the new did.
	 *
	 * @param doc the DIDDocument object
	 * @param signKey the key to sign
	 * @param storepass the password for DIDStore
	 * @throws DIDTransactionException publishing did failed because of did transaction error.
	 * @throws DIDStoreException did document does not attach store or there is no sign key to get.
	 */
	protected createDid(doc: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = DIDRequest.create(doc, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidDidCache(doc.getSubject());
	}

	/**
	 * Publish 'Update' id transaction for the existed did.
	 *
	 * @param doc the DIDDocument object
	 * @param previousTxid the previous transaction id string
	 * @param signKey the key to sign
	 * @param storepass the password for DIDStore
	 * @throws DIDTransactionException publishing did failed because of did transaction error.
	 * @throws DIDStoreException did document does not attach store or there is no sign key to get.
	 */
	protected updateDid(doc: DIDDocument, previousTxid: string, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = DIDRequest.update(doc, previousTxid, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidDidCache(doc.getSubject());
	}

	protected transferDid(doc: DIDDocument, ticket: TransferTicket, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = DIDRequest.transfer(doc, ticket, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidDidCache(doc.getSubject());
	}

    /**
     * Publish id transaction to deactivate the existed did.
     *
     * @param doc the DIDDocument object
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @throws DIDTransactionException publishing did failed because of did transaction error.
     * @throws DIDStoreException did document does not attach store or there is no sign key to get.
     */
	protected deactivateDid(doc: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = DIDRequest.deactivate(doc, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidDidCache(doc.getSubject());
	}

	/**
     * Publish id transaction to deactivate the existed did.
	 *
	 * @param target the DID to be deactivated
	 * @param targetSignKey the key to sign of specified DID
	 * @param signer the signer's DIDDocument object
	 * @param signKey the key to sign
	 * @param storepass the password for DIDStore
     * @throws DIDTransactionException publishing did failed because of did transaction error.
     * @throws DIDStoreException did document does not attach store or there is no sign key to get.
	 */
	protected deactivateDid(target: DIDDocument, targetSignKey: DIDURL,
			signer: DIDDocument, signKey: DIDURL, storepass: string,
			adapter: DIDTransactionAdapter) {
		let request = DIDRequest.deactivate(target, targetSignKey, signer, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidDidCache(target.getSubject());
	}

	public /* protected */ declareCredential(vc: VerifiableCredential, signer: DIDDocument,
			signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = CredentialRequest.declare(vc, signer, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidCredentialCache(vc.getId(), null);
		this.invalidCredentialCache(vc.getId(), vc.getIssuer());
	}

	public /* protected */ revokeCredential(vc: VerifiableCredential, signer: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = CredentialRequest.revoke(vc, signer, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidCredentialCache(vc.getId(), null);
		this.invalidCredentialCache(vc.getId(), vc.getIssuer());
	}

	public /* protected */ revokeCredential(vc: DIDURL, signer: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		let request = CredentialRequest.revoke(vc, signer, signKey, storepass);
		this.createTransaction(request, adapter);
		this.invalidCredentialCache(vc, null);
		this.invalidCredentialCache(vc, signer.getSubject());
	}
}
