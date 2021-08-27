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

'use strict';

import { DIDBackend } from "./internals";
import { DID } from "./internals";
import { VerificationEventListener } from "./internals";
import { DIDDocument } from "./internals";
import { DIDStore } from "./internals";
import { RootIdentity } from "./internals";
import { VerifiableCredential } from "./internals";
import { VerifiablePresentation } from "./internals";
import { Mnemonic } from "./internals";
import { TransferTicket } from "./internals";
import { Issuer } from "./internals";
import { DIDURL,  } from "./internals";
import { DIDBiography, DIDBiographyStatus } from "./internals";
import { IDChainRequest } from "./internals";
import * as Exceptions from "./exceptions/exceptions";
import { File } from "./internals";
import { Logger } from "./logger";
import type { DIDAdapter } from "./internals";
import { Aes256cbc } from "./crypto/aes256cbc";
import { BASE64 } from "./crypto/base64";
import { HDKey } from "./crypto/hdkey";
import { Base58 } from "./crypto/base58";
import { EcdsaSigner } from "./crypto/ecdsasigner";
import type { JSONObject, JSONValue } from "./json";
import { DefaultDIDAdapter } from "./internals";
import { SimulatedIDChainAdapter } from "./internals";
import { runningInBrowser } from "./utils";
import { JWT, JWTBuilder, JWTHeader, JWTParserBuilder, JWTParser, Claims} from "./internals";

Logger.setLevel(Logger.TRACE);

/**
 * Global initializer. For now, needed by the browser to initialize BrowserFS before running anything else.
 * TODO: Make sure this can't be called twice - possibly replace with a "promisifiable" subscriber event.
 */
/* async function initialize() {
    return new Promise<void>((resolve, reject)=>{
        console.log("BrowserFS initialization");

        if (window) {
            BrowserFS.configure({
                fs: "LocalStorage",
                options: {}
            }, function(e) {
                console.log("BrowserFS initialization complete", e);
                if (e) {
                    reject(e)
                }
                else {
                    resolve();
                }
            });
            resolve();
        }
        else {
            // NodeJS: nothing to do.
            resolve();
        }
    });
} */

export type {
    DIDAdapter,
    JSONObject,
    JSONValue
}

export {
    //initialize,

    DID,
    DIDDocument,
    DIDStore,
    DIDBackend,
    RootIdentity,
    VerifiableCredential,
    VerifiablePresentation,
    Mnemonic,
    TransferTicket,
    Issuer,
    DIDURL,
    DIDBiography,
    DIDBiographyStatus,
    IDChainRequest,
    DefaultDIDAdapter,
    SimulatedIDChainAdapter,
    Exceptions,
    VerificationEventListener,

    // jwt
    JWT,
    Claims,
    JWTHeader,
    JWTBuilder,
    JWTParser,
    JWTParserBuilder,


    // Utilities
    runningInBrowser,

    // Internal - for tests only
    File,
    Logger,
    Aes256cbc,
    BASE64,
    HDKey,
    Base58,
    EcdsaSigner
}
