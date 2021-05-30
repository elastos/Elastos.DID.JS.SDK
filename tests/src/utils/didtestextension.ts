/*
 * Copyright (c) 2019 Elastos Foundation
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

import type { DIDAdapter } from "@elastosfoundation/did-js-sdk";
import { DIDBackend, SimulatedIDChain, SimulatedIDChainAdapter } from "@elastosfoundation/did-js-sdk";
import { Web3Adapter } from "../backend/web3adapter";
import { TestConfig } from "./testconfig";

export class DIDTestExtension /* implements BeforeAllCallback, CloseableResource */ {
	private static adapter: DIDAdapter;
	private static simChain: SimulatedIDChain;

	public static setup(/* name: string */) {
		// Force load TestConfig first!!!
		let rpcEndpoint = TestConfig.rpcEndpoint;

		// if (name.equals("IDChainOperationsTest")) {
			// When run the IDChainOperationsTest only

			//DIDTestExtension.adapter = new Web3Adapter(
			//	rpcEndpoint, TestConfig.contractAddress,
			//	TestConfig.walletPath, TestConfig.walletPassword);

			DIDTestExtension.adapter = new SimulatedIDChainAdapter(
				"http://127.0.0.1:9123");
		// }

		if (DIDTestExtension.adapter == null) {
			DIDTestExtension.simChain = new SimulatedIDChain();
			//simChain.start();
			DIDTestExtension.adapter = DIDTestExtension.simChain.getAdapter();
		}

		DIDBackend.initialize(DIDTestExtension.adapter);
	}

	/**
     * Method that awaits a specific duration until a DID is supposed to be "published".
     * The simulated ID chain adapter may return quickly, while a web3 adapter may await a few
     * blocks for the transaction to be handled by the blockchain.
     */
	public static async awaitStandardPublishingDelay(): Promise<void> {
		if (DIDTestExtension.adapter instanceof Web3Adapter) {
			await DIDTestExtension.adapter.awaitStandardPublishingDelay();
		}
	}

	/* public void close() throws Throwable {
		if (simChain != null)
			simChain.stop();

		simChain = null;
		adapter = null;
	} */

	/* public static beforeAll(contextName: string) {
	 	String key = this.getClass().getName();
	    Object value = context.getRoot().getStore(GLOBAL).get(key);
	    //if (value == null) {
	    	// First test container invocation.
	    	DIDTestExtension.setup(contextName);
	    	//context.getRoot().getStore(GLOBAL).put(key, this);
	    //}
	} */

	public static async resetData() {
		if (DIDTestExtension.adapter instanceof SimulatedIDChainAdapter)
			await (DIDTestExtension.adapter as SimulatedIDChainAdapter).resetData();
	}

	public static getAdapter(): DIDAdapter {
		return DIDTestExtension.adapter;
	}
}
