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

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import { Buffer } from "buffer";
import { HDKey as DeterministicKey } from "../hdkey-secp256r1";
import { Mnemonic } from "../internals";
import { Base58 } from './base58';
import { SHA256 } from "./sha256";

/**
 * @Internal
 */
export class HDKey {
    public static PUBLICKEY_BYTES = 33;
    public static PRIVATEKEY_BYTES = 32;
    public static SEED_BYTES = 64;
    public static EXTENDED_KEY_BYTES = 82;
    public static EXTENDED_PRIVATEKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
    public static EXTENDED_PUBLICKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
    public static HARDENED_BIT = 0x80000000;
    private static PADDING_IDENTITY = 0x67;
    private static PADDING_STANDARD = 0xAD;

    private static bip32HeaderP2PKHpub = 0x0488b21e; // The 4 byte header that serializes in base58 to "xpub".
    private static bip32HeaderP2PKHpriv = 0x0488ade4; // The 4 byte header that serializes in base58 to "xprv"
    private static bip32HeaderP2WPKHpub = 0x04b24746; // The 4 byte header that serializes in base58 to "zpub".
    private static bip32HeaderP2WPKHpriv = 0x04b2430c; // The 4 byte header that serializes in base58 to "zprv"

    // Derive path: m/44'/0'/0'/0/index
    public static DERIVE_PATH_PREFIX = "m/44'/0'/0'/0/" //"44H/0H/0H/0/";

    // Pre-derive publickey path: m/44'/0'/0'
    public static PRE_DERIVED_PUBLICKEY_PATH = "m/44'/0'/0'" //"44H/0H/0H";

    public static newWithMnemonic(mnemonic: string, passphrase: string): HDKey {
        let seed = Mnemonic.toSeed(mnemonic, passphrase);
        return HDKey.newWithSeed(seed);
    }

    public static newWithSeed(seed: Buffer): HDKey {
        return HDKey.newWithKey(DeterministicKey.fromMasterSeed(seed));
    }

    public static newWithKey(key: DeterministicKey): HDKey {
        return new HDKey(key);
    }

    private constructor(private key: DeterministicKey) {
    }

    public getPrivateKeyBytes(): Buffer {
        return this.key.privateKey;
    }

    public getPrivateKeyBase58(): string {
        return Base58.encode(this.getPrivateKeyBytes());
    }

    public getPublicKeyBytes(): Buffer {
        return this.key.publicKey;
    }

    public getPublicKeyBase58(): string {
        return Base58.encode(this.getPublicKeyBytes());
    }

    public serialize(): Buffer {
        return Base58.decode(this.serializeBase58());
    }

    public serializeBase58(): string {
        let buffer = Base58.decode(this.key.privateExtendedKey);
        let base58Buffer = Buffer.alloc(82);
        buffer.copy(base58Buffer);
        let hash = SHA256.hashTwice(buffer);
        hash.copy(base58Buffer, 78, 0, 4);
        return Base58.encode(base58Buffer);
    }

    public serializePublicKey(): Buffer {
        return Base58.decode(this.serializePublicKeyBase58());
    }

    public serializePublicKeyBase58(): string {
        let buffer = Base58.decode(this.key.publicExtendedKey);
        let base58Buffer = Buffer.alloc(82);
        buffer.copy(base58Buffer);
        let hash = SHA256.hashTwice(buffer);
        hash.copy(base58Buffer, 78, 0, 4);
        return Base58.encode(base58Buffer);
    }

    public static deserialize(keyData: Buffer): HDKey {
        return this.deserializeBase58(Base58.encode(keyData));
    }

    public static deserializeBase58(keyData: string): HDKey {
        return new HDKey(DeterministicKey.fromExtendedKey(keyData));
    }

    private static transformBip32HeaderToBuffer(bip32HeaderValue: number): Buffer {
        let buffer = Buffer.alloc(4);
        buffer[0] = ((bip32HeaderValue >> 24) & 0xFF);
        buffer[1] = ((bip32HeaderValue >> 16) & 0xFF);
        buffer[2] = ((bip32HeaderValue >> 8) & 0xFF);
        buffer[3] = (bip32HeaderValue & 0xFF);
        return buffer;
    }

    public static paddingToExtendedPrivateKey(pk: Buffer): Buffer {

        let extendedPrivateKeyBytes = Buffer.alloc(HDKey.EXTENDED_PRIVATEKEY_BYTES);
        let bip32Header = HDKey.transformBip32HeaderToBuffer(this.bip32HeaderP2PKHpriv);
        bip32Header.copy(extendedPrivateKeyBytes);

        pk.copy(extendedPrivateKeyBytes, 46, 0, 32);

        let buftoHash = Buffer.alloc(78);
        extendedPrivateKeyBytes.copy(buftoHash, 0, 0, 78);
        let hash = SHA256.hashTwice(buftoHash);
        hash.copy(extendedPrivateKeyBytes, 78, 0, 4);

        return extendedPrivateKeyBytes;
    }

    public static paddingToExtendedPublicKey(pk: Buffer): Buffer {
        let extendedPublicKeyBytes = Buffer.alloc(HDKey.EXTENDED_PUBLICKEY_BYTES);
        let bip32Header = HDKey.transformBip32HeaderToBuffer(this.bip32HeaderP2PKHpub);
        bip32Header.copy(extendedPublicKeyBytes);

        pk.copy(extendedPublicKeyBytes, 45, 0, 33);

        let buftoHash = Buffer.alloc(78);
        extendedPublicKeyBytes.copy(buftoHash, 0, 0, 78);
        let hash = SHA256.hashTwice(buftoHash);
        hash.copy(extendedPublicKeyBytes, 78, 0, 4);

        return extendedPublicKeyBytes;
    }

    public deriveWithPath(path: string): HDKey {
        return new HDKey(this.key.derive(path));
    }

    public deriveWithIndex(index: number, hardened = false): HDKey {
        if (hardened) index += HDKey.HARDENED_BIT;
        return new HDKey(this.key.deriveChild(index));
    }

    private static getRedeemScript(pk: Buffer): Buffer {
        let script = Buffer.alloc(35);
        script[0] = 33;
        pk.copy(script, 1);
        script[34] = HDKey.PADDING_STANDARD;
        return script;
    }

    private static getBinAddressFromBuffer(pk: Buffer): Buffer {
        let script = this.getRedeemScript(pk);

        let hash = SHA256.sha256ripemd160(script);
        let programHash = Buffer.alloc(hash.length + 1);
        programHash[0] = HDKey.PADDING_IDENTITY;
        hash.copy(programHash, 1);

        hash = SHA256.hashTwice(programHash);
        let binAddress = Buffer.alloc(programHash.length + 4);
        programHash.copy(binAddress, 0);
        hash.copy(binAddress, programHash.length, 0, 4);

        return binAddress;
    }

    public getBinAddress(): Buffer {
        return HDKey.getBinAddressFromBuffer(this.getPublicKeyBytes());
    }

    public getAddress(): string {
        let binAddress = this.getBinAddress();

        return Base58.encode(binAddress);
    }

    public static toAddress(pk: Buffer): string {
        return Base58.encode(this.getBinAddressFromBuffer(pk));
    }

    public static isAddressValid(address: string): boolean {
        let binAddress = Base58.decode(address);

        if (binAddress.length != 25)
            return false;

        if (binAddress[0] != HDKey.PADDING_IDENTITY)
            return false;

        // Hash twice
        let hash = SHA256.hashTwice(Buffer.from(binAddress.toString("hex").substr(0, 21)));

        return (hash[0] == binAddress[21] && hash[1] == binAddress[22]
            && hash[2] == binAddress[23] && hash[3] == binAddress[24]);
    }

    public wipe() {
        // TODO
    }
}
