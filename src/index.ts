'use strict';

import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDStore } from "./didstore";
import { RootIdentity } from "./rootidentity";
import { VerifiableCredential } from "./verifiablecredential";
import { VerifiablePresentation } from "./verifiablepresentation";
import { Mnemonic } from "./mnemonic";
import { TransferTicket } from "./transferticket";
import { Issuer } from "./issuer";
import { DIDURL,  } from "./didurl";
import { DIDURLParser, DIDURLValues } from "./parser/DIDURLParser";
import * as Exceptions from "./exceptions/exceptions";
import { File } from "./file";
import { Logger } from "./logger";
import { Aes256cbc } from "./crypto/aes256cbc";
import { BASE64 } from "./crypto/base64";
import { HDKey } from "./crypto/hdkey";
import { Base58 } from "./crypto/base58";
import { EcdsaSigner } from "./crypto/ecdsasigner";
import BrowserFS from "browserfs";
import { JSONObject, JSONValue } from "./json";

/**
 * Global initializer. For now, needed by the browser to initialize BrowserFS before running anything else.
 * TODO: Make sure this can't be called twice - possibly replace with a "promisifiable" subscriber event.
 */
async function initialize() {
	return new Promise<void>((resolve, reject)=>{
		console.log("BrowserFS initialization");

		if (window) {
			/* BrowserFS.configure({
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
			}); */
			resolve();
		}
		else {
			// NodeJS: nothing to do.
			resolve();
		}
	});
}

export type {
	DIDURLValues,
	JSONObject,
	JSONValue
}

export {
	initialize,

	DID,
	DIDDocument,
	DIDStore,
	RootIdentity,
	VerifiableCredential,
	VerifiablePresentation,
	Mnemonic,
	TransferTicket,
	Issuer,
	DIDURL,
	DIDURLParser,
	Exceptions,

	// TODO - others

	// Internal - for tests only
	File,
	Logger,
	Aes256cbc,
	BASE64,
	HDKey,
	Base58,
	EcdsaSigner
}
