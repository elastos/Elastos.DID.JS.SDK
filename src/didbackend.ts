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

import { randomBytes } from "crypto";
import { CredentialBiography, CredentialBiographyStatus } from "./internals";
import type { CredentialList } from "./internals";
import { CredentialListRequest } from "./internals";
import { CredentialListResponse } from "./internals";
import { CredentialRequest } from "./internals";
import { CredentialResolveRequest } from "./internals";
import { CredentialResolveResponse } from "./internals";
import type { CredentialTransaction } from "./internals";
import { DIDBiography, DIDBiographyStatus } from "./internals";
import { DIDRequest } from "./internals";
import { DIDResolveRequest } from "./internals";
import { DIDResolveResponse } from "./internals";
import type { DIDTransaction } from "./internals";
import { IDChainRequest } from "./internals";
import type { ResolveRequest } from "./internals";
import type { ResolveResponse } from "./internals";
import { CredentialMetadata } from "./internals";
import type { DID } from "./internals";
import type { DIDAdapter } from "./internals";
import type { DIDDocument } from "./internals";
import type { DIDTransactionAdapter } from "./didtransactionadapter";
import type { DIDURL } from "./internals";
import { DIDResolveException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { LRUCache } from "./internals";
import type { TransferTicket } from "./internals";
import { checkArgument } from "./internals";
import { VerifiableCredential } from "./internals";

const log = new Logger("DIDBackend");

/**
 * The interface to indicate how to get local did document, if this did is not published to chain.
 */
export interface LocalResolveHandle {
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

    private adapter: DIDAdapter;
    private resolveHandle: LocalResolveHandle;

    private cache: LRUCache<ResolveRequest<any, any>, ResolveResponse.Result<any>>;

    private static instance: DIDBackend = null;

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

        this.cache = new LRUCache({
            maxItems: maxCacheCapacity,
            maxAge: cacheTtl/1000, //TimeUnit.MILLISECONDS,
            asyncLoader: async (key) => {
                //log.trace("Cache loading {}...", key);
                return {
                    value: await this.resolve(key)
                };
            }
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
        initialCacheCapacity: number = DIDBackend.DEFAULT_CACHE_INITIAL_CAPACITY,
        maxCacheCapacity: number = DIDBackend.DEFAULT_CACHE_MAX_CAPACITY,
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
        checkArgument(this.instance != null, "The DIDBackend was not initialized. Please call DIDBackend.initialize() with a valid DIDAdapter (i.e. new DefaultDIDAdapter()) first.");
        return this.instance;
    }

    public static isInitialized(): boolean {
        return this.instance !== null;
    }

    private generateRequestId(): string {
        return randomBytes(16).toString("hex");
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

    private async resolve(request: ResolveRequest<any, any>): Promise<ResolveResponse.Result<any>> {
        let requestJson = request.serialize(true);
        log.trace("Resolving request: " + requestJson);

        let resolvedJson = await this.getAdapter().resolve(requestJson);
        log.trace("Resolving response: " + JSON.stringify(resolvedJson));

        if (resolvedJson == null)
            throw new DIDResolveException("Unknown error, got null result.");

        let response: ResolveResponse<any, any> = null;
        try {
            switch (request.getMethod()) {
            case DIDResolveRequest.METHOD_NAME:
                response = DIDResolveResponse.parse(resolvedJson, DIDResolveResponse);
                break;

            case CredentialResolveRequest.METHOD_NAME:
                response = CredentialResolveResponse.parse(resolvedJson, CredentialResolveResponse);
                break;

            case CredentialListRequest.METHOD_NAME:
                response = CredentialListResponse.parse(resolvedJson, CredentialListResponse);
                break;

            default:
                log.error("INTERNAL - unknown resolve method '{}'", request.getMethod());
                throw new DIDResolveException("Unknown resolve method: " + request.getMethod());
            }
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDResolveException(e);
        }

        if (response.getResponseId() == null || response.getResponseId() !== request.getRequestId())
            throw new DIDResolveException("Mismatched resolve result with request.");

        if (response.getResult() != null) {
            return response.getResult();
        } else
            throw new DIDResolveException("Server error(" + response.getErrorCode()
                    + "): " + response.getErrorMessage());
    }

    public async resolveDidBiography(did: DID, all = true, force = false): Promise<DIDBiography> {
        log.info("Resolving DID {}, all={}...", did.toString(), all);

        let request = new DIDResolveRequest(this.generateRequestId());
        request.setParameters(did, all);

        if (force)
            this.cache.invalidate(request);

        try {
            return await this.cache.getAsync(request) as DIDBiography;
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
    public async resolveDid(did: DID, force = false): Promise<DIDDocument> {
        log.debug("Resolving DID {}...", did.toString());

        if (this.resolveHandle != null) {
            let doc = this.resolveHandle.resolve(did);
            if (doc != null)
                return doc;
        }

        let bio = await this.resolveDidBiography(did, false, force);

        let tx: DIDTransaction = null;
        if (bio.getStatus().equals(DIDBiographyStatus.VALID)) {
            tx = bio.getTransaction(0);
        }
        else if (bio.getStatus().equals(DIDBiographyStatus.DEACTIVATED)) {
            if (bio.getTransactionCount() != 2)
                throw new DIDResolveException("Invalid DID biography, wrong transaction count.");

            tx = bio.getTransaction(0);
            if (!tx.getRequest().getOperation().equals(IDChainRequest.Operation.DEACTIVATE))
                throw new DIDResolveException("Invalid DID biography, wrong status.");

            let doc = bio.getTransaction(1).getRequest().getDocument();
            if (doc == null)
                throw new DIDResolveException("Invalid DID biography, invalid trancations.");

            // Avoid resolve current DID recursively
            let request = new class extends DIDRequest {
                constructor(request: DIDRequest) {
                    super();
                    this.constructWithIDChainRequest(request);
                }

                protected async getSignerDocument(): Promise<DIDDocument> {
                    let sd = this.getDocument() == null ? doc : this.getDocument();
                    if (sd.isCustomizedDid())
                        await sd.resolveControllers();

                    return sd;
                }
            }(tx.getRequest());

            if (!await request.isValid())
                throw new DIDResolveException("Invalid DID biography, transaction signature mismatch.");

            tx = bio.getTransaction(1);
        }
        else if (bio.getStatus().equals(DIDBiographyStatus.NOT_FOUND)) {
            return null;
        }

        if (!tx.getRequest().getOperation().equals(IDChainRequest.Operation.CREATE) &&
            !tx.getRequest().getOperation().equals(IDChainRequest.Operation.UPDATE) &&
            !tx.getRequest().getOperation().equals(IDChainRequest.Operation.TRANSFER))
            throw new DIDResolveException("Invalid ID transaction, unknown operation.");

        if (!await tx.getRequest().isValid())
            throw new DIDResolveException("Invalid ID transaction, signature mismatch.");

        let doc = tx.getRequest().getDocument().clone();
        await doc.resolveControllers();
        let metadata = doc.getMetadata();
        metadata.setTransactionId(tx.getTransactionId());
        metadata.setSignature(doc.getProof().getSignature());
        metadata.setPublished(tx.getTimestamp());
        if (bio.getStatus().equals(DIDBiographyStatus.DEACTIVATED))
            metadata.setDeactivated(true);

        return doc;
    }

    // TODO: to be remove in the future
    public async resolveUntrustedDid(did : DID, force : boolean) : Promise<DIDDocument> {
        log.debug("Resolving untrusted DID {}...", did.toString());

        if (this.resolveHandle != null) {
            let doc = this.resolveHandle.resolve(did);
            if (doc != null)
                return doc;
        }

        let bio = await this.resolveDidBiography(did, false, force);

        let tx : DIDTransaction = null;
        switch (bio.getStatus().getValue()) {
        case DIDBiographyStatus.VALID.getValue():
            tx = bio.getTransaction(0);
            break;

        case DIDBiographyStatus.DEACTIVATED.getValue(): { // protecte the global variable scope
            if (bio.getTransactionCount() != 2)
                throw new DIDResolveException("Invalid DID biography, wrong transaction count.");

            tx = bio.getTransaction(0);
            if (tx.getRequest().getOperation() != IDChainRequest.Operation.DEACTIVATE)
                throw new DIDResolveException("Invalid DID biography, wrong status.");

            let doc = bio.getTransaction(1).getRequest().getDocument();
            if (doc == null)
                throw new DIDResolveException("Invalid DID biography, invalid trancations.");

            tx = bio.getTransaction(1);
            break;
        }

        case DIDBiographyStatus.NOT_FOUND.getValue():
            return null;
        }

        if (tx.getRequest().getOperation() != IDChainRequest.Operation.CREATE &&
                tx.getRequest().getOperation() != IDChainRequest.Operation.UPDATE &&
                tx.getRequest().getOperation() != IDChainRequest.Operation.TRANSFER)
            throw new DIDResolveException("Invalid ID transaction, unknown operation.");

        // NOTICE: Make a copy from DIDBackend cache.
        // 		   Avoid share same DIDDocument instance between DIDBackend
        //         cache and DIDStore cache.
        let doc = tx.getRequest().getDocument().clone();
        await doc.resolveControllers();
        let metadata = doc.getMetadata();
        metadata.setTransactionId(tx.getTransactionId());
        metadata.setSignature(doc.getProof().getSignature());
        metadata.setPublished(tx.getTimestamp());
        if (bio.getStatus() == DIDBiographyStatus.DEACTIVATED)
            metadata.setDeactivated(true);

        return doc;
    }

    public resolveCredentialBiography(id: DIDURL, issuer: DID = null, force = false): Promise<CredentialBiography> {
        log.info("Resolving credential {}, issuer={}...", id, issuer);

        let request = new CredentialResolveRequest(this.generateRequestId());
        request.setParameters(id, issuer);

        if (force)
            this.cache.invalidate(request);

        try {
            return this.cache.getAsync(request) as Promise<CredentialBiography>;
        } catch (e) {
            // ExecutionException
            throw new DIDResolveException(e);
        }
    }

    public async resolveCredential(id: DIDURL, issuer: DID = null, force = false): Promise<VerifiableCredential> {
        log.debug("Resolving credential {}...", id);

        let bio = await this.resolveCredentialBiography(id, issuer, force);

        let tx: CredentialTransaction = null;
        if (bio.getStatus().equals(CredentialBiographyStatus.VALID)) {
            tx = bio.getTransaction(0);
        } else if (bio.getStatus().equals(CredentialBiographyStatus.REVOKED)) {
            tx = bio.getTransaction(0);
            if (!tx.getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE))
                throw new DIDResolveException("Invalid credential biography, wrong status.");

            if (bio.getTransactionCount() < 1 || bio.getTransactionCount() > 2)
                throw new DIDResolveException("Invalid credential biography, transaction signature mismatch.");

            if (bio.getTransactionCount() == 1) {
                if (!await tx.getRequest().isValid())
                    throw new DIDResolveException("Invalid credential biography, transaction signature mismatch.");

                return null;
            } else {
                const vc = bio.getTransaction(1).getRequest().getCredential();

                // Avoid resolve current credential recursively
                let request = new (class extends CredentialRequest {
                    constructor(request: CredentialRequest) {
                        super();
                        this.constructWithIDChainRequest(request);
                    }

                    getCredential() {
                        return vc;
                    }
                })(tx.getRequest());

                if (!await request.isValid())
                    throw new DIDResolveException("Invalid credential biography, transaction signature mismatch.");
            }

            tx = bio.getTransaction(1);
        }
        else if (bio.getStatus().equals(CredentialBiographyStatus.NOT_FOUND)) {
            return null;
        }

        if (!tx.getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE))
            throw new DIDResolveException("Invalid credential transaction, unknown operation.");

        if (!await tx.getRequest().isValid())
            throw new DIDResolveException("Invalid credential transaction, signature mismatch.");

        let vc = tx.getRequest().getCredential();
        let metadata = new CredentialMetadata(vc.getId());
        metadata.setTransactionId(tx.getTransactionId());
        metadata.setPublished(tx.getTimestamp());
        if (bio.getStatus() == CredentialBiographyStatus.REVOKED)
            metadata.setRevoked(true);
        vc.setMetadata(metadata);
        return vc;
    }

    public async listCredentials(did: DID, skip: number, limit: number): Promise<DIDURL[]> {
        log.info("List credentials for {}", did);

        let request = new CredentialListRequest(this.generateRequestId());
        request.setParameters(did, skip, limit);

        let list = await this.resolve(request) as CredentialList;
        if (list == null || list.size() == 0)
            return null;

        return list.getCredentialIds();
    }

    private async createTransaction(request: IDChainRequest<any>, adapter: DIDTransactionAdapter) {
        log.info("Create ID transaction...");

        let payload = request.serialize(true);
        log.trace("Transaction payload: '{}'", payload);

        if (adapter == null)
            adapter = this.getAdapter();

        await adapter.createIdTransaction(payload, null);

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
        let request = new CredentialResolveRequest(this.generateRequestId());
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
    public async createDid(doc: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        let request = await DIDRequest.create(doc, signKey, storepass);
        await this.createTransaction(request, adapter);
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
    public async updateDid(doc: DIDDocument, previousTxid: string, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        let request = await DIDRequest.update(doc, previousTxid, signKey, storepass);
        await this.createTransaction(request, adapter);
        this.invalidDidCache(doc.getSubject());
    }

    public async transferDid(doc: DIDDocument, ticket: TransferTicket, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        let request = await DIDRequest.transfer(doc, ticket, signKey, storepass);
        await this.createTransaction(request, adapter);
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
    public async deactivateDid(doc: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        let request = await DIDRequest.deactivate(doc, signKey, storepass);
        await this.createTransaction(request, adapter);
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
    public async deactivateTargetDid(target: DIDDocument, targetSignKey: DIDURL,
            signer: DIDDocument, signKey: DIDURL, storepass: string,
            adapter: DIDTransactionAdapter) {
        let request = await DIDRequest.deactivateTarget(target, targetSignKey, signer, signKey, storepass);
        await this.createTransaction(request, adapter);
        this.invalidDidCache(target.getSubject());
    }

    public async declareCredential(vc: VerifiableCredential, signer: DIDDocument,
            signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        let request = await CredentialRequest.declare(vc, signer, signKey, storepass);
        await this.createTransaction(request, adapter);
        this.invalidCredentialCache(vc.getId(), null);
        this.invalidCredentialCache(vc.getId(), vc.getIssuer());
    }

    public async revokeCredential(vc: VerifiableCredential | DIDURL, signer: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        if (vc instanceof VerifiableCredential) {
            let request = await CredentialRequest.revoke(vc, signer, signKey, storepass);
            await this.createTransaction(request, adapter);
            this.invalidCredentialCache(vc.getId(), null);
            this.invalidCredentialCache(vc.getId(), vc.getIssuer());
        }
        else {
            let request = await CredentialRequest.revoke(vc, signer, signKey, storepass);
            await this.createTransaction(request, adapter);
            this.invalidCredentialCache(vc, null);
            this.invalidCredentialCache(vc, signer.getSubject());
        }
    }
}
