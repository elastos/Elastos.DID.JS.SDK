import { Buffer } from "buffer";
import * as sodium from "libsodium-wrappers";
import { checkArgument } from "./utils";

export interface Curve25519KeyPair {
    ed25519Sk: Uint8Array;
    ed25519Pk: Uint8Array;
    privateKey: Uint8Array;
    publicKey: Uint8Array;
}

/**
 * Stream class to encrypt data.
 */
export abstract class EncryptionStream {
    header(): Uint8Array {
        throw new Error('Not implemented.');
    }

    push(clearText: Uint8Array | Buffer) {
        return this.pushAny(clearText, true);
    }

    pushLast(clearText: Uint8Array | Buffer) {
        return this.pushAny(clearText, true);
    }

    pushAny(clearText: Uint8Array | Buffer, isFinal): Uint8Array {
        throw new Error('Not implemented.');
    }
}

/**
 * Stream class to decrypt data.
 */
export abstract class DecryptionStream {
    static getHeaderLen() {
        return sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
    }

    static getEncryptExtraSize() {
        return sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
    }

    pull(cipherText: Uint8Array | Buffer): Uint8Array {
        throw new Error('Not implemented.');
    }

    isComplete(): boolean {
        throw new Error('Not implemented.');
    }
}

export class CryptoUtils {
    static getCurve25519KeyPair(key: Uint8Array): Curve25519KeyPair {
        const edKeyPair = sodium.crypto_sign_seed_keypair(key);
        if (!edKeyPair) {
            throw new Error('Failed to generate ed25519 key pair.');
        }

        const curvePrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(edKeyPair.privateKey);
        if (!curvePrivateKey) {
            throw new Error('Failed to generate curve25519 private key.');
        }
        const curvePublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(edKeyPair.publicKey);
        if (!curvePublicKey) {
            throw new Error('Failed to generate curve25519 public key.');
        }
        // console.log(`curve25519 public key: ${Buffer.from(curvePublicKey).toString('hex')}`);

        return {
            ed25519Sk: edKeyPair.privateKey,
            ed25519Pk: edKeyPair.publicKey,
            privateKey: curvePrivateKey,
            publicKey: curvePublicKey
        }
    }
}

class SSEncrypt extends EncryptionStream {
    private readonly header_: Uint8Array;
    private readonly state: sodium.StateAddress;

    constructor(key: Uint8Array) {
        super();
        const result = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
        if (!result) {
            throw new Error('Failed to init encryption.');
        }
        this.header_ = result.header;
        this.state = result.state;
    }

    header(): Uint8Array {
        return this.header_;
    }

    pushAny(clearText: Uint8Array | Buffer, isFinal): Uint8Array {
        checkArgument(!!clearText, 'Invalid clearText');

        const text = clearText instanceof Uint8Array ? clearText : new Uint8Array(clearText);
        const tag = isFinal ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
            : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

        const result = sodium.crypto_secretstream_xchacha20poly1305_push(this.state, text, null, tag);
        if (!result) {
            throw new Error('Failed to encrypt clearText.');
        }

        return result;
    }
}

class SSDecrypt extends DecryptionStream {
    private readonly state: sodium.StateAddress;
    private complete: boolean;

    constructor(key, header) {
        super();

        this.state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key);
        if (!this.state) {
            throw new Error('Failed to init decryption.');
        }
        this.complete = false;
    }

    pull(cipherText: Uint8Array | Buffer): Uint8Array {
        checkArgument(!!cipherText, 'Invalid clearText');

        const text = cipherText instanceof Uint8Array ? cipherText : new Uint8Array(cipherText);

        const msgTag = sodium.crypto_secretstream_xchacha20poly1305_pull(this.state, text);
        if (!msgTag) {
            throw new Error('Failed to decrypt the cipherText.');
        }

        if (msgTag.tag == sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
            this.complete = true;
        }

        return msgTag.message;
    }

    isComplete(): boolean {
        return this.complete;
    }
}

/**
 * Class to encrypt & decrypt message or stream data.
 */
export interface Cipher {
    /**
     * Set the other side public key for curve25519
     */
    setOtherSideCurve25519PublicKey(key: Buffer);

    /**
     * Encrypt the message with small size.
     *
     * @param data the data to be encrypted.
     * @param nonce the nonce for encryption.
     */
    encrypt(data: Buffer, nonce: Buffer): Buffer;

    /**
     * Decrypt the message with small size.
     *
     * @param data the data to be decrypted.
     * @param nonce the nonce for decryption, same as the nonce on encrypt().
     */
    decrypt(data: Buffer, nonce: Buffer): Buffer;

    /**
     * Get a encrypt stream for large size.
     */
    createEncryptionStream(): EncryptionStream;

    /**
     * Get a decrypt stream for large size.
     *
     * @param header the header from EncryptionStream.
     */
    createDecryptionStream(header: Buffer): DecryptionStream;

    /**
     * Get the public key for ed25519
     */
    getEd25519PublicKey(): Buffer;

    /**
     * Get the public key for curve25519
     */
    getCurve25519PublicKey(): Buffer;
}

export class XChaCha20Poly1305Cipher implements Cipher {
    constructor(private key: Uint8Array) {}

    setOtherSideCurve25519PublicKey(key: Buffer) {
        throw new Error('Not support yet.');
    }

    encrypt(data: Buffer, nonce: Buffer): Buffer {
        checkArgument(!!data, 'Invalid data');
        checkArgument(!!nonce, 'Invalid nonce');

        const result = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
            new Uint8Array(data), null, null, new Uint8Array(nonce), this.key);
        if (!result) {
            throw new Error('Failed to encrypt data.');
        }

        return Buffer.from(result);
    }

    decrypt(data: Buffer, nonce: Buffer): Buffer {
        checkArgument(!!data, 'Invalid data');
        checkArgument(!!nonce, 'Invalid nonce');

        const result = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null, new Uint8Array(data), null, new Uint8Array(nonce), this.key);
        if (!result) {
            throw new Error('Failed to decrypt data.');
        }

        return Buffer.from(result);
    }

    createEncryptionStream(): EncryptionStream {
        return new SSEncrypt(this.key);
    }

    createDecryptionStream(header: Buffer): DecryptionStream {
        return new SSDecrypt(this.key, new Uint8Array(header));
    }

    getEd25519PublicKey(): Buffer {
        throw new Error('Not support yet.');
    }

    getCurve25519PublicKey(): Buffer {
        throw new Error('Not support yet.');
    }
}

export class Curve25519Cipher implements Cipher {
    private encryptKey: Uint8Array;
    private sharedKeys: sodium.CryptoKX;

    constructor(private keyPair: Curve25519KeyPair, private isServer: boolean) {
        this.encryptKey = null;
        this.sharedKeys = null;
    }

    private checkEncryptionKeys() {
        if (!this.encryptKey || !this.sharedKeys) {
            throw new Error('Please set an other side public key first.');
        }
    }

    setOtherSideCurve25519PublicKey(key: Buffer) {
        this.encryptKey = sodium.crypto_box_beforenm(new Uint8Array(key), this.keyPair.privateKey);
        if (!this.encryptKey) {
            throw new Error('Failed to generate encrypt keys.');
        }
        this.sharedKeys = this.isServer
            ? sodium.crypto_kx_server_session_keys(this.keyPair.publicKey, this.keyPair.privateKey, new Uint8Array(key))
            : sodium.crypto_kx_client_session_keys(this.keyPair.publicKey, this.keyPair.privateKey, new Uint8Array(key));
        if (!this.sharedKeys) {
            throw new Error('Failed to generate shared keys.');
        }
    }

    encrypt(data: Buffer, nonce: Buffer): Buffer {
        checkArgument(!!data, 'Invalid data');
        checkArgument(!!nonce, 'Invalid nonce');
        this.checkEncryptionKeys();

        const result = sodium.crypto_box_easy_afternm(new Uint8Array(data), new Uint8Array(nonce), this.encryptKey);
        if (!result) {
            throw new Error('Failed to encrypt data.');
        }

        return Buffer.from(result);
    }

    decrypt(data: Buffer, nonce: Buffer): Buffer {
        checkArgument(!!data, 'Invalid data');
        checkArgument(!!nonce, 'Invalid nonce');
        this.checkEncryptionKeys();

        const result = sodium.crypto_box_open_easy_afternm(new Uint8Array(data), new Uint8Array(nonce), this.encryptKey);
        if (!result) {
            throw new Error('Failed to decrypt data.');
        }

        return Buffer.from(result);
    }

    createEncryptionStream(): EncryptionStream {
        this.checkEncryptionKeys();
        return new SSEncrypt(this.sharedKeys.sharedTx);
    }

    createDecryptionStream(header: Buffer): DecryptionStream {
        this.checkEncryptionKeys();
        return new SSDecrypt(this.sharedKeys.sharedRx, new Uint8Array(header));
    }

    getEd25519PublicKey(): Buffer {
        return Buffer.from(this.keyPair.ed25519Pk);
    }

    getCurve25519PublicKey(): Buffer {
        return Buffer.from(this.keyPair.publicKey);
    }
}
