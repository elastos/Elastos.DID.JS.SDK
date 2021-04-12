'use strict';
import { Core } from "./core";
import { Did } from "./did";
import { DidDocument } from "./diddocument";
import { IdChainRequest } from "./DEPRECATED_idchainrequest";
import { Hive } from "./hive";

export class ElastosClient {

	private static readonly core: Core = new Core();
	public static readonly did: Did = new Did(ElastosClient.core);
	public static readonly didDocuments: DidDocument = new DidDocument(ElastosClient.core);
	public static readonly idChainRequest: IdChainRequest = new IdChainRequest(ElastosClient.core);
	public static readonly hive: Hive;

	private constructor() {}
}
