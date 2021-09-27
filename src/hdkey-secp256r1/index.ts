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
import * as assert from 'assert';
import * as bs58check from 'bs58';
import { Buffer } from "buffer";
// import * as crypto from 'crypto';
import * as crypto from 'crypto-browserify';
import * as secp256r1 from './secp256r1';


const MASTER_SECRET = Buffer.from('Bitcoin seed', 'utf8');
const LEN = 78;

interface Version {
    private: number;
    public: number;
}

// Bitcoin hardcoded by default, can use package `coininfo` for others
const BITCOIN_VERSIONS: Version = { private: 0x0488ade4, public: 0x0488b21e };

export interface HDKeyJSON {
    xpriv: string;
    xpub: string;
}

export class HDKey {
    static HARDENED_OFFSET = 0x80000000;

    static fromMasterSeed(seedBuffer: Buffer, versions?: Version) {
        const I = crypto
            .createHmac('sha512', MASTER_SECRET)
            .update(seedBuffer)
            .digest();
        const IL = I.slice(0, 32);
        const IR = I.slice(32);

        const hdkey = new HDKey(versions);
        hdkey.chainCode = IR;
        hdkey.privateKey = IL;

        return hdkey;
    }

    // https://en.bitcoin.it/wiki/BIP_0032
    static fromExtendedKey(base58key: string, versions?: any) {
        // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
        versions = versions || BITCOIN_VERSIONS;
        const hdkey = new HDKey(versions);

        const keyBuffer = bs58check.decode(base58key);

        const version = keyBuffer.readUInt32BE(0);
        assert.ok(
            version === versions.private || version === versions.public,
            'Version mismatch: does not match private or public'
        );

        hdkey.depth = keyBuffer.readUInt8(4);
        hdkey.parentFingerprint = keyBuffer.readUInt32BE(5);
        hdkey.index = keyBuffer.readUInt32BE(9);
        hdkey.chainCode = keyBuffer.slice(13, 45);

        const key = keyBuffer.slice(45);
        if (key.readUInt8(0) === 0) {
            // private
            assert.ok(version === versions.private, 'Version mismatch: version does not match private');
            hdkey.privateKey = key.slice(1, 33); // cut off first 0x0 byte + remove the 4 bytes checksum in the end
        } else {
            assert.ok(version === versions.public, 'Version mismatch: version does not match public');
            hdkey.publicKey = key.slice(0, 33); // Remove the 4 bytes checksum in the end
        }

        return hdkey;
    }

    static fromJSON(obj: HDKeyJSON) {
        return HDKey.fromExtendedKey(obj.xpriv);
    }

    versions: Version;
    depth: number;
    index: number;
    _privateKey: Buffer | null;
    _publicKey: Buffer | null;
    _identifier: Buffer;
    chainCode: any;
    _fingerprint: number;
    parentFingerprint: number;

    constructor(versions?: Version) {
        this.versions = versions || BITCOIN_VERSIONS;
        this.depth = 0;
        this.index = 0;
        this._privateKey = null;
        this._publicKey = null;
        this.chainCode = null;
        this._fingerprint = 0;
        this.parentFingerprint = 0;
    }

    get fingerprint() {
        return this._fingerprint;
    }

    get identifier() {
        return this._identifier;
    }

    get pubKeyHash() {
        return this.identifier;
    }

    get privateKey() {
        return this._privateKey;
    }

    set privateKey(value: Buffer | null) {
        if (value === null) {
            throw new Error('Can not directly set privateKey to null.');
        }

        assert.equal(value.length, 32, 'Private key must be 32 bytes.');
        assert.ok(secp256r1.privateKeyVerify(value) === true, 'Invalid private key');

        this._privateKey = value;
        this._publicKey = secp256r1.publicKeyCreate(value, true);
        this._identifier = hash160(this.publicKey!);
        this._fingerprint = this._identifier.slice(0, 4).readUInt32BE(0);
    }

    get publicKey() {
        return this._publicKey;
    }

    set publicKey(value: Buffer | null) {
        if (value === null) {
            throw new Error('Can not directly set privateKey to null.');
        }

        assert.ok(value.length === 33 || value.length === 65, 'Public key must be 33 or 65 bytes.');
        assert.ok(secp256r1.publicKeyVerify(value) === true, 'Invalid public key');

        this._publicKey = secp256r1.publicKeyConvert(value, true); // force compressed point
        this._identifier = hash160(this.publicKey!);
        this._fingerprint = this._identifier.slice(0, 4).readUInt32BE(0);
        this._privateKey = null;
    }

    get privateExtendedKey() {
        if (this._privateKey)
            return bs58check.encode(
                serialize(this, this.versions.private, Buffer.concat([Buffer.alloc(1, 0), this.privateKey!]))
            );
        else return null;
    }

    get publicExtendedKey() {
        return bs58check.encode(serialize(this, this.versions.public, this.publicKey!));
    }

    derive(path: string): HDKey {
        if (path === 'm' || path === 'M' || path === "m'" || path === "M'") {
            return this;
        }

        const entries = path.split('/');
        let hdkey: HDKey = this;
        entries.forEach(function (c, i) {
            if (i === 0) {
                assert.ok(/^[mM]{1}/.test(c), 'Path must start with "m" or "M"');
                return;
            }

            const hardened = c.length > 1 && c[c.length - 1] === "'";
            let childIndex = parseInt(c, 10); // & (HARDENED_OFFSET - 1)
            assert.ok(childIndex < HDKey.HARDENED_OFFSET, 'Invalid index');
            if (hardened) {
                childIndex += HDKey.HARDENED_OFFSET;
            }

            hdkey = hdkey.deriveChild(childIndex);
        });

        return hdkey;
    }

    deriveChild(index: number): HDKey {
        const isHardened = index >= HDKey.HARDENED_OFFSET;
        const indexBuffer = Buffer.allocUnsafe(4);
        indexBuffer.writeUInt32BE(index, 0);

        let data: Buffer;

        if (isHardened) {
            // Hardened child
            assert.ok(this.privateKey, 'Could not derive hardened child key');

            let pk = this.privateKey!;
            const zb = Buffer.alloc(1, 0);
            pk = Buffer.concat([zb, pk]);

            // data = 0x00 || ser256(kpar) || ser32(index)
            data = Buffer.concat([pk, indexBuffer]);
        } else {
            // Normal child
            // data = serP(point(kpar)) || ser32(index)
            //      = serP(Kpar) || ser32(index)
            data = Buffer.concat([this.publicKey!, indexBuffer]);
        }

        const I = crypto
            .createHmac('sha512', this.chainCode)
            .update(data)
            .digest();
        const IL = I.slice(0, 32);
        const IR = I.slice(32);

        const hd = new HDKey(this.versions);

        // Private parent key -> private child key
        if (this.privateKey) {
            // ki = parse256(IL) + kpar (mod n)
            try {
                hd.privateKey = secp256r1.privateKeyTweakAdd(this.privateKey, IL);
                // throw if IL >= n || (privateKey + IL) === 0
            } catch (err) {
                // In case parse256(IL) >= n or ki == 0, one should proceed with the next value for i
                return this.deriveChild(index + 1);
            }
            // Public parent key -> public child key
        } else {
            // Ki = point(parse256(IL)) + Kpar
            //    = G*IL + Kpar
            try {
                hd.publicKey = secp256r1.publicKeyTweakAdd(this.publicKey!, IL, true);
                // throw if IL >= n || (g**IL + publicKey) is infinity
            } catch (err) {
                // In case parse256(IL) >= n or Ki is the point at infinity, one should proceed with the next value for i
                return this.deriveChild(index + 1);
            }
        }

        hd.chainCode = IR;
        hd.depth = this.depth + 1;
        hd.parentFingerprint = this.fingerprint; // .readUInt32BE(0)
        hd.index = index;

        return hd;
    }

    sign(hash: Buffer) {
        return secp256r1.sign(hash, this.privateKey!).signature;
    }

    verify(hash: Buffer, signature: Buffer) {
        return secp256r1.verify(hash, signature, this.publicKey!);
    }

    toJSON(): HDKeyJSON {
        return {
            xpriv: this.privateExtendedKey,
            xpub: this.publicExtendedKey
        };
    }
}

function serialize(hdkey: HDKey, version: number, key: Buffer) {
    // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
    const buffer = Buffer.allocUnsafe(LEN);

    buffer.writeUInt32BE(version, 0);
    buffer.writeUInt8(hdkey.depth, 4);

    const fingerprint = hdkey.depth ? hdkey.parentFingerprint : 0x00000000;
    buffer.writeUInt32BE(fingerprint, 5);
    buffer.writeUInt32BE(hdkey.index, 9);

    hdkey.chainCode.copy(buffer, 13);
    key.copy(buffer, 45);

    return buffer;
}

function hash160(buf: Buffer) {
    const sha = crypto
        .createHash('sha256')
        .update(buf)
        .digest();
    return crypto
        .createHash('rmd160')
        .update(sha)
        .digest();
}