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

import { DID, DIDBackend, DIDStore, Logger, Mnemonic, RootIdentity } from "../../typings/internals";
import { AssistDIDAdapter } from "./assistadapter"

const log = new Logger("InitializeDID");
export class InitializeDID {
	// Mnemonic passphrase and the store password should set by the end user.
	private static passphrase = "mypassphrase";
	private static storepass = "mypassword";

	private store: DIDStore;

	public initDIDBackend(): void {
		// Initialize the DID backend globally.
		DIDBackend.initialize(new AssistDIDAdapter("mainnet"));
	}

	public async initRootIdentity(): Promise<void> {
		// Location to your DIDStore
		let storePath = "/tmp/InitializeDID.store";

		this.store = await DIDStore.open(storePath);

		// Check the store whether contains the root private identity.
		if (this.store.containsRootIdentities())
			return; // Already exists

		// Create a mnemonic use default language(English).
		let mg = Mnemonic.getInstance();
		let mnemonic = mg.generate();

		log.info("Please write down your mnemonic and passwords:");
		log.info("  Mnemonic: " + mnemonic);
		log.info("  Mnemonic passphrase: " + InitializeDID.passphrase);
		log.info("  Store password: " + InitializeDID.storepass);

		// Initialize the root identity.
		RootIdentity.createFromMnemonic(mnemonic, InitializeDID.passphrase, this.store, InitializeDID.storepass);
	}

	public async initDid(): Promise<void> {
		let store = this.store;
		// Check the DID store already contains owner's DID(with private key).
		let dids = await this.store.selectDids(new class implements DIDStore.DIDFilter {
			public select(d: DID): boolean {
				let doc = store.loadDid(d);
				return (store.containsPrivateKeys(d) && doc.getMetadata().getAlias() == "me");
			}
		});

		if (dids.length > 0) {
			return; // Already create my DID.
		}

		let id = await store.loadRootIdentity();
		let doc = await id.newDid(InitializeDID.storepass);
		doc.getMetadata().setAlias("me");
		log.info("My new DID created: " + doc.getSubject());
		await doc.publish(InitializeDID.storepass);
	}
}

let initializeDID = async () => {
	let example = new InitializeDID();

	try {
		example.initDIDBackend();
		await example.initRootIdentity();
		example.initDid();
	} catch (e) {
		log.error(e);
	}
}

initializeDID();
