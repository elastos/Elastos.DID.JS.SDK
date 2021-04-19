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
import { DIDURL } from "./didurl";
import * as Exceptions from "./exceptions/exceptions";

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
	Exceptions

	// TODO
}

/* DEPRECATED export class ElastosClient {

	private static readonly core: Core = new Core();
	public static readonly did: Did = new Did(ElastosClient.core);
	public static readonly didDocuments: DidDocument = new DidDocument(ElastosClient.core);
	public static readonly idChainRequest: IdChainRequest = new IdChainRequest(ElastosClient.core);
	public static readonly hive: Hive;

	private constructor() {}
}
*/
