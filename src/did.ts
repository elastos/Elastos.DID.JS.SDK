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

import { DIDMetadata } from "./didmetadata";
import {
    checkEmpty,
    checkNotNull,
    isEmpty
} from "./utils";
import { DIDDocument } from "./diddocument";
import { DIDBackend } from "./didbackend";
import { DIDBiography } from "./backend/didbiography";
import {
    JsonSerialize,
    JsonDeserialize
} from "jackson-js";
import {
    Serializer,
    Deserializer
} from "./serializers";
import {
	JsonStringifierTransformerContext,
	JsonParserTransformerContext
} from "jackson-js/dist/@types";
import { IllegalArgumentException } from "./exceptions/exceptions";
import { DIDURLParser } from "./parser/DIDURLParser";
import { StringUtil } from "./stringutil";


export class DIDSerializer extends Serializer {
    public static serialize(did: DID, context: JsonStringifierTransformerContext): string {
		return did ? did.toString() : null;
	}
}

export class DIDDeserializer extends Deserializer {
	public static deserialize(value: string, context: JsonParserTransformerContext): DID {
		try {
			if (value && value.includes("{"))
				throw new IllegalArgumentException("Invalid DIDURL");
			return new DID(value);
		} catch (e) {
			throw new IllegalArgumentException("Invalid DID");
		}
	}
}

/**
 * DID is a globally unique identifier that does not require
 * a centralized registration authority.
 */
@JsonSerialize({using:  DIDSerializer.serialize})
@JsonDeserialize({using:  DIDDeserializer.deserialize})
export class DID {

    public static METHOD: string = "elastos";

    private method: string | null;
    private methodSpecificId: string | null;
    private metadata: DIDMetadata | null;

    public constructor(methodOrDID: string, methodSpecificId: string | null = null) {
        this.metadata = null;
        if (methodSpecificId) {
            let method: string = methodOrDID;
            checkEmpty(method, "Invalid method");
            checkEmpty(methodSpecificId, "Invalid methodSpecificId");

            this.method = method;
            this.methodSpecificId = methodSpecificId;
        } else {
            let did = methodOrDID;
            checkEmpty(did, "Invalid DID string");
            this.method = null;
            this.methodSpecificId = null;


            let didParsed = DIDURLParser.NewFromURL(methodOrDID)
            this.method = didParsed.did.method;
            this.methodSpecificId = didParsed.did.methodSpecificId;
        }
    }

    public static valueOf(did: string): DID | null{
        return isEmpty(did) ? null : new DID(did);
    }

    public getMethod(): string | null {
        return this.method;
    }

    public getMethodSpecificId(): string | null {
        return this.methodSpecificId;
    }

    public setMetadata(metadata: DIDMetadata): void {
        this.metadata = metadata;
    }

    public getMetadata(): DIDMetadata {
        if (this.metadata == null) {
            try {
                let resolved: DIDDocument = this.resolve();
                this.metadata = resolved != null ? resolved.getMetadata() : new DIDMetadata(this);
            } catch (e) {
                this.metadata = new DIDMetadata(this);
            }
        }

        return this.metadata;
    }

    public isDeactivated(): boolean {
        return this.getMetadata().isDeactivated();
    }

    /**
     * Resolve DID content(DIDDocument).
     *
     * @param force force = true, DID content must be from chain.
     *              force = false, DID content could be from chain or local cache.
     * @return the DIDDocument object
     * @throws DIDResolveException throw this exception if resolving did failed.
     */
    public resolve(force: boolean = false): DIDDocument {
        let doc = DIDBackend.getInstance().resolveDid(this, force);
        if (doc != null)
            this.setMetadata(doc.getMetadata());

        return doc;
    }

    /**
     * Resolve DID Document in asynchronous model.
     *
     * @param force force = true, DID content must be from chain.
     *              force = false, DID content could be from chain or local cache.
     * @return the new CompletableStage, the result is the DIDDocument interface for
     *             resolved DIDDocument if success; null otherwise.
     */
    public resolveAsync(force: boolean = false): Promise<DIDDocument> {
        return new Promise((resolve, reject)=>{
            try {
                resolve(this.resolve(force));
            } catch (e) {
                // DIDBackendException
                reject(e);
            }
        });
    }

    /**
     * Resolve all DID transactions.
     *
     * @return the DIDBiography object
     * @throws DIDResolveException throw this exception if resolving all did transactions failed.
     */
    public resolveBiography(): DIDBiography {
        return DIDBackend.getInstance().resolveDidBiography(this);
    }

    /**
     * Resolve all DID transactions in asynchronous model.
     *
     * @return the new CompletableStage, the result is the DIDHistory interface for
     *             resolved transactions if success; null otherwise.
     */
    public resolveBiographyAsync(): Promise<DIDBiography> {
        return new Promise((resolve, reject)=>{
            try {
                resolve(this.resolveBiography());
            } catch (e) {
                // DIDResolveException
                reject(e);
            }
        });
    }

    public toString(): string {
        return "did:"+this.method+":"+this.methodSpecificId;
    }

    public hashCode(): number {
        return DID.METHOD.hashCode() + this.methodSpecificId.hashCode();
    }

    public equals(obj: Object): boolean {
        if (obj == this)
            return true;

        if (obj instanceof DID) {
            let did = obj;
            let eq = this.method === did.method;
            return eq ? this.methodSpecificId === did.methodSpecificId : eq;
        }

        if (typeof obj === "string") {
            let did = obj;
            return this.toString() === did;
        }

        return false;
    }

    public compareTo(did: DID): number {
        checkNotNull(did, "did is null");

        let rc = StringUtil.compareTo(this.method, did.method);
        return rc == 0 ? StringUtil.compareTo(this.methodSpecificId, did.methodSpecificId) : rc;
    }
}



/*
import { CoinType, ChangeChain, SignType } from './constants'
import { MnemonicManager, KeyManager } from "./core"

const bip39 = require('bip39')

export class DID {

    public async generateNew (password = "") {
        let mnemonic = MnemonicManager.generateMnemonic(password);
        return await this.loadFromMnemonic(mnemonic, password);
    }

    public async loadFromMnemonic (mnemonic, password = "", index = 0) {
        if (!bip39.validateMnemonic(mnemonic)) {
            return null;
        }
        let seed = await MnemonicManager.getSeedFromMnemonic(mnemonic, password);
        let privateKey = KeyManager.generateSubPrivateKey(this.buf2hex(seed), CoinType.ELA, ChangeChain.EXTERNAL, index).toString('hex');
        let masterPublicKey = KeyManager.getMasterPublicKey(seed, CoinType.ELA);
        let publicKey = KeyManager.generateSubPublicKey(masterPublicKey, ChangeChain.EXTERNAL, index).toString('hex')
        let did = KeyManager.getAddressBase(publicKey, SignType.ELA_IDCHAIN).toString()
        let publicBase58 = KeyManager.getPublicKeyBase58(masterPublicKey)

        return {
            mnemonic: mnemonic,
            seed: this.buf2hex(seed),
            did: `did:elastos:${did}`,
            publicKey: publicKey,
            privateKey: privateKey,
            publicKeyBase58: publicBase58
        }

    }

    private buf2hex(buffer: Buffer): Buffer {
        return Buffer.from(Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join(''));
    }
}
*/