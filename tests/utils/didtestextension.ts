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

import type { DIDAdapter } from "../../dist/did";
import { DIDBackend, SimulatedIDChain } from "../../dist/did";
import { TestConfig } from "./testconfig";

export class DIDTestExtension /* implements BeforeAllCallback, CloseableResource */ {
	private static adapter: DIDAdapter;
	private static simChain: SimulatedIDChain;

	public static setup(/* name: string */) {
		// Force load TestConfig first!!!
		let network: string = TestConfig.network;

		/* if (name.equals("IDChainOperationsTest")) {
			if (network.equalsIgnoreCase("mainnet") || network.equalsIgnoreCase("testnet")) {
				adapter = new SPVAdapter(network,
					TestConfig.walletDir, TestConfig.walletId,
					new SPVAdapter.PasswordCallback() {
						@Override
						public String getPassword(String walletDir, String walletId) {
							return TestConfig.walletPassword;
						}
					});
			}
		} */

		if (DIDTestExtension.adapter == null) {
			DIDTestExtension.simChain = new SimulatedIDChain();
			//simChain.start();
			DIDTestExtension.adapter = DIDTestExtension.simChain.getAdapter();
		}

		DIDBackend.initialize(DIDTestExtension.adapter);
	}

	/* public void close() throws Throwable {
		if (simChain != null)
			simChain.stop();

		if (adapter != null && adapter instanceof SPVAdapter)
			((SPVAdapter)adapter).destroy();

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

	/* public static void resetData() {
		simChain.reset();
	}

	public static DIDAdapter getAdapter() {
		return adapter;
	} */
}
