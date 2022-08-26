import { Buffer } from "buffer";
import * as sodium from "libsodium-wrappers";
import { checkArgument } from "./utils";

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
    pull(cipherText: Uint8Array | Buffer): Uint8Array {
        throw new Error('Not implemented.');
    }

    isComplete(): boolean {
        throw new Error('Not implemented.');
    }
}

class XChaCha20Poly1305Utils {
    static encrypt(key: Uint8Array, data: Buffer, nonce: Buffer): Buffer {
        checkArgument(!!data, 'Invalid data');
        checkArgument(!!nonce, 'Invalid nonce');

        const result = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
            new Uint8Array(data), null, null, new Uint8Array(nonce), key);
        if (!result) {
            throw new Error('Failed to encrypt data.');
        }

        return Buffer.from(result);
    }

    static decrypt(key: Uint8Array, data: Buffer, nonce: Buffer): Buffer {
        checkArgument(!!data, 'Invalid data');
        checkArgument(!!nonce, 'Invalid nonce');

        const result = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null, new Uint8Array(data), null, new Uint8Array(nonce), key);
        if (!result) {
            throw new Error('Failed to decrypt data.');
        }

        return Buffer.from(result);
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
}

export class XChaCha20Poly1305Cipher implements Cipher {
    constructor(private key: Uint8Array) {}

    encrypt(data: Buffer, nonce: Buffer): Buffer {
        return XChaCha20Poly1305Utils.encrypt(this.key, data, nonce);
    }

    decrypt(data: Buffer, nonce: Buffer): Buffer {
        return XChaCha20Poly1305Utils.decrypt(this.key, data, nonce);
    }

    createEncryptionStream(): EncryptionStream {
        return new SSEncrypt(this.key);
    }

    createDecryptionStream(header: Buffer): DecryptionStream {
        return new SSDecrypt(this.key, new Uint8Array(header));
    }
}

export class Curve25519Cipher implements Cipher {
    constructor(private encryptKey, private decryptKey) {}

    encrypt(data: Buffer, nonce: Buffer): Buffer {
        return XChaCha20Poly1305Utils.encrypt(this.encryptKey, data, nonce);
    }

    decrypt(data: Buffer, nonce: Buffer): Buffer {
        return XChaCha20Poly1305Utils.decrypt(this.decryptKey, data, nonce);
    }

    createEncryptionStream(): EncryptionStream {
        return new SSEncrypt(this.encryptKey);
    }

    createDecryptionStream(header: Buffer): DecryptionStream {
        return new SSDecrypt(this.decryptKey, new Uint8Array(header));
    }
}
