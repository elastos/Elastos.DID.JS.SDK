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

import testConfig from "../assets/test.config.json";

export class TestConfig {
	public static network: string;

	public static passphrase: string;
	public static storePass: string;

	public static walletDir: string;
	public static walletId: string;
	public static walletPassword: string;

	public static tempDir: string;
	public static storeRoot: string;

	//public static Level level;

	static initialize() {
		this.network = testConfig.network
		// Java: System.setProperty("org.elastos.did.network", network);

		this.passphrase = testConfig.mnemnoic.passphrase;
		this.storePass = testConfig.store.pass;

		this.tempDir = testConfig.temp.dir;
		this.storeRoot = testConfig.store.root || this.tempDir + "/DIDStore";

		this.walletDir = testConfig.wallet.dir;
		this.walletId = testConfig.wallet.id;
		this.walletPassword = testConfig.wallet.password;

		//level = Level.valueOf(config.getProperty("log.level", "info").toUpperCase());

		// We use logback as the logging backend
	    /* Logger root = (Logger)LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
	    root.setLevel(level); */
	}
}