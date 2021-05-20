'use strict';

import { DIDBackend } from "./internals";
import { DID } from "./internals";
import { DIDDocument, DIDDocumentPublicKey, DIDDocumentBuilder } from "./internals";
import { DIDStore } from "./internals";
import { RootIdentity } from "./internals";
import { VerifiableCredential } from "./internals";
import { VerifiablePresentation } from "./internals";
import { Mnemonic } from "./internals";
import { TransferTicket } from "./internals";
import { Issuer } from "./internals";
import { DIDURL,  } from "./internals";
import { DIDURLParser, DIDURLValues } from "./parser/DIDURLParser";
import { DIDBiography } from "./internals";
import { IDChainRequest } from "./internals";
import * as Exceptions from "./exceptions/exceptions";
import { File } from "./internals";
import { Logger } from "./logger";
import { DIDAdapter } from "./internals";
import { Aes256cbc } from "./crypto/aes256cbc";
import { BASE64 } from "./crypto/base64";
import { HDKey } from "./crypto/hdkey";
import { Base58 } from "./crypto/base58";
import { EcdsaSigner } from "./crypto/ecdsasigner";
import { JSONObject, JSONValue } from "./json";
import { SimulatedIDChain } from "./internals";
import { DefaultDIDAdapter } from "./internals";
import { runningInBrowser } from "./utils";

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
	DIDURLValues,
	DIDAdapter,
	JSONObject,
	JSONValue
}

export {
	//initialize,

	DID,
	DIDDocument,
	DIDDocumentPublicKey,
	DIDDocumentBuilder,
	DIDStore,
	DIDBackend,
	RootIdentity,
	VerifiableCredential,
	VerifiablePresentation,
	Mnemonic,
	TransferTicket,
	Issuer,
	DIDURL,
	DIDURLParser,
	DIDBiography,
	IDChainRequest,
	DefaultDIDAdapter,
	SimulatedIDChain,
	Exceptions,

	// TODO - others

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
