// /*
//  * Copyright (c) 2019 Elastos Foundation
//  *
//  * Permission is hereby granted, free of charge, to any person obtaining a copy
//  * of this software and associated documentation files (the "Software"), to deal
//  * in the Software without restriction, including without limitation the rights
//  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  * copies of the Software, and to permit persons to whom the Software is
//  * furnished to do so, subject to the following conditions:
//  *
//  * The above copyright notice and this permission notice shall be included in all
//  * copies or substantial portions of the Software.
//  *
//  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  * SOFTWARE.
//  */

// package org.elastos.did.crypto;

// import static org.junit.jupiter.api.Assertions.assertEquals;
// import static org.junit.jupiter.api.Assertions.assertFalse;
// import static org.junit.jupiter.api.Assertions.assertTrue;

// import java.util.Arrays;

// import org.elastos.did.Mnemonic;
// import org.elastos.did.exception.DIDException;
// import org.junit.jupiter.api.BeforeAll;
// import org.junit.jupiter.api.Test;

// public class EcdsaSignerTest {
// 	private static final String plain = "The quick brown fox jumps over the lazy dog.";
// 	private static final String nonce = "testcase";

// 	private static HDKey key;
// 	private static byte[] sig;

// 	@BeforeAll
// 	public static void setup() throws DIDException {
// 		String mnemonic = Mnemonic.getInstance().generate();

// 		HDKey root = new HDKey(mnemonic, "");
// 		key = root.derive(HDKey.DERIVE_PATH_PREFIX + 0);

// 		sig = EcdsaSigner.signData(key.getPrivateKeyBytes(), plain.getBytes(), nonce.getBytes());

// 		assertEquals(64, sig.length);
// 	}

// 	@Test
// 	public void testVerify() {
// 		boolean result = EcdsaSigner.verifyData(key.getPublicKeyBytes(), sig, plain.getBytes(), nonce.getBytes());

// 		assertTrue(result);
// 	}

// 	@Test
// 	public void testVerify1() {
// 		boolean result = EcdsaSigner.verifyData(key.getPublicKeyBytes(), sig, (plain + ".").getBytes(), nonce.getBytes());

// 		assertFalse(result);
// 	}

// 	@Test
// 	public void testVerify2() {
// 		byte[] modSig = Arrays.copyOf(sig, sig.length);
// 		modSig[8] +=1;

// 		boolean result = EcdsaSigner.verifyData(key.getPublicKeyBytes(), modSig, plain.getBytes(), nonce.getBytes());

// 		assertFalse(result);
// 	}

// 	@Test
// 	public void testVerify3() {
// 		byte[] modSig = Arrays.copyOf(sig, sig.length);
// 		modSig[8] +=1;

// 		boolean result = EcdsaSigner.verifyData(key.getPublicKeyBytes(), modSig, plain.getBytes(), "testcase0".getBytes());

// 		assertFalse(result);
// 	}

// 	@Test
// 	public void testVerify4() {
// 		byte[] modSig = Arrays.copyOf(sig, sig.length);
// 		modSig[8] +=1;

// 		boolean result = EcdsaSigner.verifyData(key.getPublicKeyBytes(), modSig, plain.getBytes());

// 		assertFalse(result);
// 	}

// 	@Test
// 	public void testCompatibility() {
// 		String input = "abcdefghijklmnopqrstuvwxyz";
// 		String pkBase58 = "voHKsUjoPSJSQKWLJHWYzUfEv3NEaRUyJReoZVS6XCYM";
// 		String expectedSig1 = "SlDq9rsEQJgS83ydi2cPMiwXm6SgJCuwYwx_NqpOwf5IQcbfUM574GHThnvJ5lgTeyeOwVcxbWyQxehlK3MO-A";
// 		String expectedSig2 = "gm4Bx8ijQjBEFsf1Cm1mHcqSzFHquoQe235uzL3OUDJiIuFnJ49lEWn0RueIfgCZbrDEhLdxKSaNYqnBpjiR6A";

// 		byte[] pk = Base58.decode(pkBase58);

// 		byte[] sig = Base64.decode(expectedSig1,
// 				Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
// 		boolean result = EcdsaSigner.verifyData(pk, sig, input.getBytes());
// 		assertTrue(result);

// 		sig = Base64.decode(expectedSig2,
// 				Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
// 		result = EcdsaSigner.verifyData(pk, sig, input.getBytes());
// 		assertTrue(result);
// 	}
// }

//practice pigeon diagram jeans piano abstract tape cause lounge raise index spy

import {EcdsaSigner} from "../../src/crypto/ecdsasigner"
import { HDKey } from "../../src/crypto/hdkey"
import { Base58 } from "../../src/crypto/base58"



describe('ECSDA Signer Tests', () => {
	var mnemonic: string = "practice pigeon diagram jeans piano abstract tape cause lounge raise index spy";
	let plain: string = "The quick brown fox jumps over the lazy dog.";
	let nonce: string = "testcase";
	var key: HDKey;
	var sig: string;
	beforeAll(() => {
		let root = HDKey.newWithMnemonic(mnemonic, "");
		key = root.deriveWithIndex(0)
		console.log("key", key.getPrivateKeyBytes().toString("hex"))
		sig = EcdsaSigner.signData(key.getPrivateKeyBytes(), Buffer.from(plain, "utf-8"), Buffer.from(nonce, "utf-8"))
		expect(sig).toBeDefined()
	});

	
	
	test('Verify signature is correct', () => {
		let response = EcdsaSigner.verifyData(key.getPublicKeyBytes(), sig, Buffer.from(plain, "utf-8"), Buffer.from(nonce, "utf-8"))

		expect(response).toBeTruthy()
	});

	test('Compatibility', () =>{
		let input = 'abcdefghijklmnopqrstuvwxyz';
		let pkBase58 = 'voHKsUjoPSJSQKWLJHWYzUfEv3NEaRUyJReoZVS6XCYM';
		let expectedSig1 = "SlDq9rsEQJgS83ydi2cPMiwXm6SgJCuwYwx_NqpOwf5IQcbfUM574GHThnvJ5lgTeyeOwVcxbWyQxehlK3MO-A";
		let expectedSig2 = "gm4Bx8ijQjBEFsf1Cm1mHcqSzFHquoQe235uzL3OUDJiIuFnJ49lEWn0RueIfgCZbrDEhLdxKSaNYqnBpjiR6A";
		
		let pk = '031F56955CC005122F11CEC5264EA5968240A90F01434FB0A1B7429BE4B9157D46';

		let root = HDKey.deserialize(Buffer.from(pk, "hex"))
		console.log("root", root)
		let isSig1Valid = EcdsaSigner.verifyData(root.getPublicKeyBytes() ,expectedSig1, Buffer.from(input, "utf-8"))
		expect(isSig1Valid).toBeTruthy()

		// let isSig2Valid = EcdsaSigner.verifyData(pk,expectedSig2, Buffer.from(input, "utf-8"))
		// expect(isSig2Valid).toBeTruthy()

// 		byte[] pk = Base58.decode(pkBase58);

// 		byte[] sig = Base64.decode(expectedSig1,
// 				Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
// 		boolean result = EcdsaSigner.verifyData(pk, sig, input.getBytes());
// 		assertTrue(result);

// 		sig = Base64.decode(expectedSig2,
// 				Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
// 		result = EcdsaSigner.verifyData(pk, sig, input.getBytes());
// 		assertTrue(result);
	})
  });

