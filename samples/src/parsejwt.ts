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

import { DIDBackend, Logger, JWTParserBuilder, JWTBuilder, BASE64 } from "../../typings/internals";
import { AssistDIDAdapter } from "./assistadapter"

const log = new Logger("ParseJWT");
export class ParseJWT {
	public static printJwt(token: string): void {
		let toks = token.split("\\.");

		if (toks.length != 2 && toks.length != 3) {
			log.info("Invalid token: " + token);
			return;
		}

        let sb = BASE64.toString(toks[0]) + '.' + BASE64.toString(toks[1]) + '.';
        if (toks[2] != "")
            sb += toks[2];

        log.info("Token: " + token);
        log.info("Plain: " + sb.toString());
	}
}

let parseJWT = async () => {
		// Initializa the DID backend globally.
		DIDBackend.initialize(new AssistDIDAdapter("testnet"));

		let token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1OTU5MDM1MjUsImV4cCI6MTU5NTk4OTkyNSwiaXNzIjoiZGlkOmVsYXN0b3M6aVlwUU13aGVEeHlTcWl2b2NTSmFvcHJjb0RUcVFzRFlBdSIsImNvbW1hbmQiOiJ2b3RlZm9ycHJvcG9zYWwiLCJkYXRhIjp7InByb3Bvc2FsSGFzaCI6ImY0MTRkMjUzODY0NDQ2NDNiYTE2NzZlYmZjZjU0ODJjNmZlYjNkMDI1OTlmNjE0NTJlYTYwMDg5OWQ4ZDdiZWUifX0.AsKlYyG3RyMBXBiDWkjZ4etbhCNjEp9MKIy8ySW2rBvCD9xFUiKUrjbsB4V0YI7eV47aqso4y8OdSXxc9yfoCw";
		ParseJWT.printJwt(token);

		let jp = new JWTParserBuilder().build();
		let jwt = jp.parse(token);

		log.info(jwt.toString());
}

parseJWT();
