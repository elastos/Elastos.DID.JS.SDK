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

import { DIDBackend, DIDStore, Logger, RootIdentity, SimulatedIDChainAdapter } from "@elastosfoundation/did-js-sdk";
import { AssistDIDAdapter } from "./assistadapter";
import { File } from "./file"

const log = new Logger("RestoreFromMnemonic");
export class RestoreFromMnemonic {
	constructor(){}

	public async restore(): Promise<void> {
		let mnemonic = "advance duty suspect finish space matter squeeze elephant twenty over stick shield";
		let passphrase = "secret";
		let storepass = "passwd";

		// Initializa the DID backend globally.
		DIDBackend.initialize(new SimulatedIDChainAdapter("http://127.0.0.1:9123"));

		let storePath = "/tmp/RestoreFromMnemonic.store";
		this.deleteFile(new File(storePath));

		let store = await DIDStore.open(storePath);

		let id = RootIdentity.createFromMnemonic(mnemonic, passphrase, store, storepass);
		await id.synchronize();

		let dids = await store.listDids();
		if (dids.length > 0) {
			for (let did of dids) {
				log.info(did);
				log.info(store.loadDid(did));
			}

		} else {
			log.info("No dids restored.");
		}
	}

	private deleteFile(file: File): void {
		if (file.isDirectory()) {
			let children = file.listFiles();
			for (let child of children)
				this.deleteFile(child);
		}

		file.delete();
	}
}

export async function restoreFromMnemonic(argv) {
	let sample = new RestoreFromMnemonic();
	await sample.restore();
}
