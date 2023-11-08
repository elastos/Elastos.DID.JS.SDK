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

import type { CredentialMetadata } from "./internals";
import type { DID } from "./internals";
import type { DIDDocument } from "./internals";
import type { DIDMetadata } from "./internals";
import type { DIDURL } from "./internals";
import type { RootIdentity } from "./internals";
import type { VerifiableCredential } from "./internals";
import type { DIDStoreMetadata } from "./internals";
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
}

/**
 * @internal (tag for docs)
 * The interface for DIDStorage to support different file system.
 */
export interface DIDStorage {
    init(): Promise<void>;

    getLocation(): string;

    storeMetadata(metadata: DIDStoreMetadata): Promise<void>;

    loadMetadata(): Promise<DIDStoreMetadata>;

    storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata): Promise<void>;

    /**
     * Load DID Metadata.
     *
     * @param id the owner of Metadata.
     * @return the meta data
     * @throws DIDStorageException DIDStorage error.
     */
    loadRootIdentityMetadata(id: string): Promise<RootIdentity.Metadata>;

    /**
     * Save the raw root identity to the storage.
     *
     * @param id the id of the RootIdentity
     * @param mnemonic mnemonic words that the identity was generate from or null
     * @param privateKey the encrypted private key of the RootIdentity
     * @param publicKey the pre-derived public key of the RootIdentity
     * @param index the index hint for DID deriving
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    storeRootIdentity(id: string, mnemonic: string, privateKey: string, publicKey: string, index: number): Promise<void>;

    /**
     * Read the RootIdentity object from the storage.
     *
     * @param id the id of the RootIdentity
     * @return the RootIdentity object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadRootIdentity(id: string): Promise<RootIdentity>;

    containsRootIdentity(id: string): Promise<boolean>;

    updateRootIdentityIndex(id: string, index: number): Promise<void>;

    loadRootIdentityPrivateKey(id: string): Promise<string>;

    /**
     * Read the mnemonic that generate the RootIdentity.
     *
     * @param id the id of the RootIdentity
     * @return the mnemonic string or null if not exists
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadRootIdentityMnemonic(id: string): Promise<string>;

    deleteRootIdentity(id: string): Promise<boolean>;

    listRootIdentities(): Promise<RootIdentity[]>;

    containsRootIdentities(): Promise<boolean>;

    /**
     * Save the DID metadata object to this storage.
     *
     * @param did the owner of the metadata object
     * @param metadata a DIDMetadata object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    storeDidMetadata(did: DID, metadata: DIDMetadata): Promise<void>;

    /**
     * Read the DID metadata object from this storage.
     *
     * @param did the target DID object
     * @return the DIDMetadata object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadDidMetadata(did: DID): Promise<DIDMetadata>;

    /**
     * Save the DID document to this storage.
     *
     * @param doc a DIDDocument object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    storeDid(doc: DIDDocument): Promise<void>;

    /**
     * Read the DID document from this storage.
     *
     * @param did the target DID object
     * @return the DIDDocument object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadDid(did: DID): Promise<DIDDocument>;

    /**
     * Delete the specified DID.
     *
     * @param did the specified DID
     * @return the returned value is true if deleting is successful;
     *         the returned value is false if deleting is failed.
     * @throws DIDStorageException DIDStorage error.
     */
    deleteDid(did: DID): Promise<boolean>;

    /**
     * List all DIDs according to the specified condition.
     *
     * @return the DID array.
     * @throws DIDStorageException DIDStorage error.
     */
    listDids(): Promise<DID[]>;

    /**
     * Check whether this storage contains the specificed did.
     *
     * @return true if contains the specificed did, false otherwise
     * @throws DIDStorageException DIDStorage error.
     */
    containsDid(did: DID): Promise<boolean>;

    /**
     * Check whether this storage contains the dids.
     *
     * @return true if contains did object, false otherwise
     * @throws DIDStorageException DIDStorage error.
     */
    containsDids(): Promise<boolean>;

    /**
     * Save the credential's metadata to this storage.
     *
     * @param id the id of the credential
     * @param metadata the credential's metadata object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    storeCredentialMetadata(id: DIDURL, metadata: CredentialMetadata): Promise<void>;

    /**
     * Read the credential's metadata object from this storage.
     *
     * @param id the id of the target credential
     * @return the credential's metadata object
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadCredentialMetadata(id: DIDURL): Promise<CredentialMetadata>;

    /**
     * Save the credential object to this storage.
     *
     * @param credential a VerifiableCredential content
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    storeCredential(id: DIDURL, credential: Uint8Array, encypted: boolean): Promise<void>;

    /**
     * Read the specified credential object from this storage.
     *
     * @param id the id of the target credential
     * @return the VerifiableCredential content
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadCredential(id: DIDURL): Promise<[Uint8Array, boolean]>;

    /**
     * Check whether this storage contains the specified credential.
     *
     * @param id the id of the target credential
     * @return true if contains credential object, false otherwise
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    containsCredential(id: DIDURL): Promise<boolean>;

    /**
     * Check whether this storage contains the credentials that owned by the
     * given DID.
     *
     * @param did the target DID object
     * @return true if contains credential object owned by the given DID,
     * 		   false otherwise
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    containsCredentials(did: DID): Promise<boolean>;

    /**
     * Delete the specified credential from this storage.
     *
     * @param id the id of the target credential to be delete
     * @return true if the credential exists and deleted successful, false otherwise
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    deleteCredential(id: DIDURL): Promise<boolean>;

    /**
     * List the Credentials owned the specified DID.
     *
     * @param did the owner of Credential
     * @return the Credential array owned the specified DID.
     * @throws DIDStorageException DIDStorage error.
     */
    listCredentials(did: DID): Promise<DIDURL[]>;

    containsPrivateKey(id: DIDURL): Promise<boolean>;
    /**
     * Save the encrypted private key to this storage.
     *
     * @param id the key id
     * @param privateKey the encrypted private key
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    storePrivateKey(id: DIDURL, privateKey: string): Promise<void>;

    /**
     * Read the encrypted private key from this storage
     *
     * @param id the key id
     * @return the encrypted private key
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    loadPrivateKey(id: DIDURL): Promise<string>;

    /**
     * Check whether this storage contains the private key that owned by the
     * given DID.
     *
     * @param did the target DID object
     * @return true if contains private key that owned by the given DID,
     * 		   false otherwise
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    containsPrivateKeys(did: DID): Promise<boolean>;

    /**
     * Delete the specific private key from this storage.
     *
     * @param id the id of the key to be delete
     * @return true if the key exists and deleted successful, false otherwise
     * @throws DIDStorageException if an error occurred when accessing the DID storage
     */
    deletePrivateKey(id: DIDURL): Promise<boolean>;

    /**
     * List the private keys owned the specified DID.
     *
     * @param did the owner of private key
     * @return the private key array owned the specified DID.
     * @throws DIDStorageException DIDStorage error.
     */
    listPrivateKeys(did: DID): Promise<DIDURL[]>;

    /**
     * Change password for DIDStore.
     *
     * @param reEncryptor the ReEncryptor handle
     * @throws DIDStorageException DIDStorage error.
     */
    changePassword(reEncryptor: ReEncryptor): Promise<void>;
}
