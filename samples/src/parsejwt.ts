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

import { DIDBackend, Logger, JWTParserBuilder, BASE64 } from "@elastosfoundation/did-js-sdk";
import { AssistDIDAdapter } from "./assistadapter";

const log = new Logger("ParseJWT");
export class ParseJWT {
	public static printJwt(token: string): void {
		let toks = token.split(".");

		if (toks.length != 2 && toks.length != 3) {
			log.trace("Invalid token: " + token);
			return;
		}

        let sb = BASE64.toString(toks[0]) + '.' + BASE64.toString(toks[1]) + '.';
        if (toks[2] != "")
            sb += toks[2];

        log.trace("Token: " + token);
        log.trace("Plain: " + sb.toString());
	}
}

export async function parseJWT(argv) {
		// Initializa the DID backend globally.
	DIDBackend.initialize(new AssistDIDAdapter("mainnet"));

	let token = "eyJhbGciOiAiRVMyNTYiLCAiY3R5cCI6ICJqc29uIiwgImxpYnJhcnkiOiAiRWxhc3RvcyBESUQiLCAidHlwIjogIkpXVCIsICJ2ZXJzaW9uIjogIjEuMCIsICJraWQiOiAiZGlkOmVsYXN0b3M6aVdGQVVZaFRhMzVjMWZQZTNpQ0p2aWhaSHg2cXV1bW55bSNrZXkyIn0.eyJpc3MiOiJkaWQ6ZWxhc3RvczppV0ZBVVloVGEzNWMxZlBlM2lDSnZpaFpIeDZxdXVtbnltIiwic3ViIjoiSnd0VGVzdCIsImp0aSI6IjAiLCJhdWQiOiJUZXN0IGNhc2VzIiwiaWF0IjoxNjM4MTY3NjM5LCJleHAiOjE3MDEyMTA4MzksIm5iZiI6MTYwNjYwMjgzOSwiZm9vIjoiYmFyIiwib2JqZWN0Ijp7ImhlbGxvIjoid29ybGQiLCJ0ZXN0IjoidHJ1ZSJ9LCJmaW5pc2hlZCI6ZmFsc2V9.h0hLrePTLkekxDTv6fqg6NqlDTEcatcIa-LMZD0GEXMWnX3dmzv6XRmfwEX8u_dCFGjFQlUUlYhEgmvtt2cscA";
	ParseJWT.printJwt(token);

	try {
		let jp = new JWTParserBuilder().build();
		let jwt = await jp.parse(token);
		log.trace(jwt.toString());
	} catch (e) {
        log.error(e);
    }
}
