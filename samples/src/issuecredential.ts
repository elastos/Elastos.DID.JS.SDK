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

import dayjs from "dayjs";
import { JSONObject } from "../../typings";
import { DID, DIDBackend, DIDDocument, DIDStore, Issuer, Logger, Mnemonic, RootIdentity, VerifiableCredential, VerifiablePresentation } from "../../typings/internals";
import { AssistDIDAdapter } from "./assistadapter"

const log = new Logger("IssueCredential");
export namespace IssueCredential {
	export class Entity {
		// Mnemonic passphrase and the store password should set by the end user.
		private static passphrase = "mypassphrase";
		private static storepass = "mypassword";

		private name: string;
		private store: DIDStore;
		private did: DID;

		protected constructor(name: string) {
			this.name = name;

			this.initRootIdentity();
			this.initDid();
		}

		protected async initRootIdentity(): Promise<void> {
			let storePath = "/tmp/exampleStore";
			this.store = await DIDStore.open(storePath);

			// Check the store whether contains the root private identity.
			if (this.store.containsRootIdentities())
				return; // Already exists

			// Create a mnemonic use default language(English).
			let mg = Mnemonic.getInstance();
			let mnemonic = mg.generate();

			log.info("[%s] Please write down your mnemonic and passwords:%n", name);
			log.info("  Mnemonic: " + mnemonic);
			log.info("  Mnemonic passphrase: " + Entity.passphrase);
			log.info("  Store password: " + Entity.storepass);

			// Initialize the root identity.
			RootIdentity.createFromMnemonic(mnemonic, Entity.passphrase, this.store, Entity.storepass);
		}

		protected async initDid(): Promise<void> {
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
			let doc = await id.newDid(Entity.storepass);
			doc.getMetadata().setAlias("me");
			log.info("My new DID created: " + doc.getSubject());
			await doc.publish(Entity.storepass);
		}

		public getDid(): DID {
			return this.did;
		}

		public async getDocument(): Promise<DIDDocument> {
			return await this.store.loadDid(this.did);
		}

		public getName(): string {
			return this.name;
		}

		protected getStorePassword(): string {
			return Entity.storepass;
		}
	}

	export class University extends Entity {
		private issuer: Issuer;

		public constructor(name: string) {
			super(name);
		}

		public async issueDiplomaFor(student: Student): Promise<VerifiableCredential> {
			let subject: JSONObject = {};
			subject.name = student.getName();
			subject.degree = "bachelor";
			subject.institute = "Computer Science";
			subject.university = this.getName();

            let exp = dayjs().add(5, 'years').toDate();

            this.issuer = new Issuer(await this.getDocument());
			let cb = this.issuer.issueFor(student.getDid());
			return await cb.id("diploma")
				.typeWithContext("DiplomaCredential", "https://ttech.io/credentials/diploma/v1")
				.properties(subject)
				.expirationDate(exp)
				.seal(this.getStorePassword());
		}
	}

	export class Student extends Entity {
		public constructor(name: string) {
			super(name);
		}
	}
}

let issueCredential = async () => {
    try {
        // Initializa the DID backend globally.
        DIDBackend.initialize(new AssistDIDAdapter("mainnet"));

        let university = new IssueCredential.University("Elastos");
        let student = new IssueCredential.Student("John Smith", "Male", "johnsmith@example.org");

        let vc = await university.issueDiplomaFor(student);
        log.info("The diploma credential:");
        log.info("  " + vc);
        log.info("  Genuine: " + await vc.isGenuine());
        log.info("  Expired: " + await vc.isExpired());
        log.info("  Valid: " + await vc.isValid());
    } catch (e) {
        log.error(e);
    }
}

issueCredential();
