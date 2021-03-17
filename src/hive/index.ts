import { Core } from  "../core"

export class Hive {

	private core: Core;

	public constructor (core: Core) {
		this.core = core;
	}

	public getPublicKey (pubKeyHex) {
	    return this.core.getPublicKey(pubKeyHex);
	}
}
