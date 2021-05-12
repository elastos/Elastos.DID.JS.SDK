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
import { Buffer } from "./buffer";

import { JSONObject, JSONValue } from "./json";

export type {
	DIDURLValues,
	JSONObject,
	JSONValue
}

export {
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
	EcdsaSigner,
	Buffer
}
