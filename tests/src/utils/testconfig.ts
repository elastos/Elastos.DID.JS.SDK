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

//import testConfig from "../assets/test.config.json";

import { join } from "path";
import { 
	runningInBrowser, 
	Logger 
} from "@elastosfoundation/did-js-sdk";
import testConfigFile from "../assets/test.config.json";

export class TestConfig {
	public static DID_INDEX_LOOPS = 100; // TMP DEBUG 100;
	private static TEST_CONFIG_FILE = "tests/assets/test.config.json";

	public static network: string;
	public static rpcEndpoint: string;
	public static contractAddress: string;

	public static walletPath: string;
	public static walletPassword: string;

	public static passphrase: string;
	public static storePass: string;

	public static tempDir: string;
	public static storeRoot: string;

	static initialize() {
		let testConfig = this.loadConfiguration(this.TEST_CONFIG_FILE);

		this.network = testConfig.network
		// Java: System.setProperty("org.elastos.did.network", network);
		this.rpcEndpoint = testConfig.idchain.rpcEndpoint;
		this.contractAddress = testConfig.idchain.contractAddress;

		this.walletPath = testConfig.wallet.path;
		this.walletPassword = testConfig.wallet.password;

		this.passphrase = testConfig.mnemonic.passphrase;
		this.storePass = testConfig.store.pass;

		if (runningInBrowser()) // browser
			this.tempDir = "/generated/tmp"; // TODO: does this actually work in browser ?
		else // nodejs
			this.tempDir = join(__dirname, "../..", "generated", "tmp");

		this.storeRoot = testConfig.store.root || this.tempDir + "/DIDStore";

		Logger.setLevel(Logger.TRACE);
	}

	private static loadConfiguration(configFile: string): any {
		return testConfigFile;
	}
}
