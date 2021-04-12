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

import { CredentialMetadata } from "./credentialmetadata";
import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDMetadata } from "./didmetadata";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { RootIdentity } from "./rootidentity";
import { VerifiableCredential } from "./verifiablecredential";

/**
 * The inferface to change password.
 */
export interface ReEncryptor {
	/**
	 * Reencrypt in the changing password.
	 *
	 * @param data the data need to reencrypted
	 * @return the reencrypted data
	 * @throws DIDStoreException DIDStore error.
	 */
	reEncrypt(data: string): string;
};

/**
 * The interface for DIDStorage to support different file system.
 */
export interface DIDStorage {
	getLocation(): string;

	storeMetadata(metadata: DIDStore.Metadata);

	loadMetadata(): DIDStore.Metadata;

	storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata);

	/**
	 * Load DID Metadata.
	 *
	 * @param did the owner of Metadata.
	 * @return the meta data
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadRootIdentityMetadata(id: string): RootIdentity.Metadata;

	/**
	 * Store private identity.
	 *
	 * @param key the private identity
	 * @throws DIDStorageException store private identity failed.
	 */
	storeRootIdentity(id: string, mnemonic: string, privateKey: string, publicKey: string, index: number);

	/**
	 * Load private identity.
	 *
	 * @return the private identity from file
	 * @throws DIDStorageException load private identity failed.
	 */
	loadRootIdentity(id: string): RootIdentity;

	updateRootIdentityIndex(id: string, index: number);

	loadRootIdentityPrivateKey(id: string): string;

	/**
	 * Load mnemonic.
	 *
	 * @return the mnemonic string
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadRootIdentityMnemonic(id: string): string;

	deleteRootIdentity(id: string): boolean;

	listRootIdentities(): RootIdentity[];

	containsRootIdenities(): boolean;

	/**
	 * Store DID Metadata.
	 *
	 * @param did the owner of Metadata
	 * @param metadata the meta data
	 * @throws DIDStorageException DIDStorage error.
	 */
	storeDidMetadata(did: DID, metadata: DIDMetadata);

	/**
	 * Load DID Metadata.
	 *
	 * @param did the owner of Metadata.
	 * @return the meta data
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadDidMetadata(did: DID): DIDMetadata;

	/**
	 * Store DID Document.
	 *
	 * @param doc the DIDDocument object.
	 * @throws DIDStorageException DIDStorage error.
	 */
	storeDid(doc: DIDDocument);

	/**
	 * Load DID content(DIDDocument).
	 *
	 * @param did the specified DID
	 * @return the DID Document object
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadDid(did: DID): DIDDocument;

	/**
     * Delete the specified DID.
     *
     * @param did the specified DID
     * @return the returned value is true if deleting is successful;
     *         the returned value is false if deleting is failed.
     * @throws DIDStorageException DIDStorage error.
	 */
	deleteDid(did: DID): boolean;

	/**
	 * List all DIDs according to the specified condition.
	 *
	 * @return the DID array.
	 * @throws DIDStorageException DIDStorage error.
	 */
	listDids(): DID[];

	/**
     * Store meta data for the specified Credential.
     *
     * @param did the owner of the specified Credential
     * @param id the identifier of Credential
     * @param metadata the meta data for Credential
     * @throws DIDStorageException DIDStorage error.
	 */
	storeCredentialMetadata(id: DIDURL, metadata: CredentialMetadata);

	/**
	 * Load the meta data about the specified Credential.
	 *
	 * @param did the owner of Credential
     * @param id the identifier of Credential
	 * @return the meta data for Credential
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadCredentialMetadata(id: DIDURL): CredentialMetadata;

	/**
	 * Store the specified Credential.
	 *
	 * @param credential the Credential object
	 * @throws DIDStorageException DIDStorage error.
	 */
	storeCredential(credential: VerifiableCredential);

	/**
	 * Load the specified Credential.
	 *
	 * @param did the owner of Credential
	 * @param id the identifier of Credential
	 * @return the Credential object
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadCredential(id: DIDURL): VerifiableCredential;

	/**
	 * Judge whether does DIDStore contain any credential owned the specific DID.
	 *
	 * @param did the owner of Credential
	 * @return the returned value is true if there is no credential owned the specific DID.
	 * @throws DIDStorageException DIDStorage error.
	 */
	containsCredentials(did: DID): boolean;

	/**
	 * Delete the specified Credential
	 *
	 * @param did the owner of Credential
	 * @param id the identifier of Credential
	 * @return the returned value is true if there is no credential owned the specific DID;
	 *         the returned value is false if there is credentials owned the specific DID.
	 * @throws DIDStorageException DIDStorage error.
	 */
	deleteCredential(id: DIDURL): boolean;

	/**
	 * List the Credentials owned the specified DID.
	 *
	 * @param did the owner of Credential
	 * @return the Credential array owned the specified DID.
	 * @throws DIDStorageException DIDStorage error.
	 */
	listCredentials(did: DID): DIDURL[];

	/**
	 * Store private key. Encrypt and encode private key with base64url method.
	 *
	 * @param did the owner of key
	 * @param id the identifier of key
	 * @param privateKey the original private key(32 bytes)
	 * @throws DIDStorageException DIDStorage error.
	 */
	storePrivateKey(id: DIDURL, privateKey: string);

	/**
	 * Load private key.
	 *
	 * @param did the owner of key
	 * @param id the identifier of key
	 * @return the encrypted private key
	 * @throws DIDStorageException DIDStorage error.
	 */
	loadPrivateKey(id: DIDURL): string;

	/**
	 * Judge whether there is private key owned the specified DID in DIDStore.
	 *
	 * @param did the specified DID
	 * @return the returned value is true if there is private keys owned the specified DID;
	 *         the returned value is false if there is no private keys owned the specified DID.
	 * @throws DIDStorageException DIDStorage error.
	 */
	containsPrivateKeys(did: DID): boolean;

	/**
	 * Delete the private key owned to the specified key.
	 *
	 * @param did the owner of key
	 * @param id the identifier of key
	 * @return the returned value is true if deleting private keys successfully;
	 *         the returned value is false if deleting private keys failed.
	 * @throws DIDStorageException DIDStorage error.
	 */
	deletePrivateKey(id: DIDURL): boolean;

	/**
	 * List the private keys owned the specified DID.
	 *
	 * @param did the owner of private key
	 * @return the private key array owned the specified DID.
	 * @throws DIDStorageException DIDStorage error.
	 */
	listPrivateKeys(did: DID): DIDURL[];

    /**
     * Change password for DIDStore.
     *
     * @param reEncryptor the ReEncryptor handle
     * @throws DIDStorageException DIDStorage error.
     */
	changePassword(reEncryptor: ReEncryptor);
}
