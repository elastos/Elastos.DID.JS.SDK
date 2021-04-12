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
import { ParserHelper } from "./parser/parserhelper"
import { checkEmpty, checkNotNull, isEmpty } from "./utils";
import { DIDDocument } from "./diddocument";
import { DIDResolveException } from "./exceptions/exceptions";
import { rejects } from "node:assert";
import { DIDBackend } from "./didbackend";
import { Class } from "./class";
import { DIDBiography } from "./backend/didbiography";

/**
 * DID is a globally unique identifier that does not require
 * a centralized registration authority.
 */
//@JsonSerialize(using = DID.Serializer.class)
//@JsonDeserialize(using = DID.Deserializer.class)
export class DID {

    public const static METHOD: string = "elastos";

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
            ParserHelper.parse(did, true, new Listener());
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

    public /*protected*/ setMetadata(metadata: DIDMetadata): void {
        this.metadata = metadata;
    }

    public getMetadata(): DIDMetadata {
        if (this.metadata == null) {
            try {
                let resolved: DIDDocument = this.resolve();
                this.metadata = resolved != null ? resolved.getMetadata() : new DIDMetadata(this);
            } catch (e: DIDResolveException) {
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
            let eq = this.method.equals(did.method);
            return eq ? this.methodSpecificId.equals(did.methodSpecificId) : eq;
        }

        if (typeof obj === "string") {
            let did = obj;
            return this.toString().equals(did);
        }

        return false;
    }

    public compareTo(did: DID): number {
        checkNotNull(did, "did is null");

        let rc = this.method.compareTo(did.method);
        return rc == 0 ? this.methodSpecificId.compareTo(did.methodSpecificId) : rc;
    }
}

export namespace DID {
    export class Serializer extends StdSerializer<DID> {
        private static final long serialVersionUID = -5048323762128760963L;

        public constructor(t: Class<DID> = null) {
            super(t);
        }

        public serialize(did: DID, JsonGenerator gen, SerializerProvider provider) {
            gen.writeString(did.toString());
        }
    }

    export class Deserializer extends StdDeserializer<DID> {
        private static final long serialVersionUID = -306953602840919050L;

        public Deserializer() {
            this(null);
        }

        public Deserializer(Class<?> vc) {
            super(vc);
        }

        public deserialize(JsonParser p, DeserializationContext ctxt): DID {
            let token: JsonToken = p.getCurrentToken();
            if (!token.equals(JsonToken.VALUE_STRING))
                throw ctxt.weirdStringException(p.getText(), DID.class, "Invalid DIDURL");

            String did = p.getText().trim();

            try {
                return new DID(did);
            } catch (MalformedDIDException e) {
                throw ctxt.weirdStringException(did, DID.class, "Invalid DID");
            }
        }
    }

    export Listener extends DIDURLBaseListener {
        @Override
        public void exitMethod(DIDURLParser.MethodContext ctx) {
            String method = ctx.getText();
            if (!method.equals(DID.METHOD))
                throw new IllegalArgumentException("Unknown method: " + method);

            DID.this.method = method;
        }

        @Override
        public void exitMethodSpecificString(
                DIDURLParser.MethodSpecificStringContext ctx) {
            DID.this.methodSpecificId = ctx.getText();
        }
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