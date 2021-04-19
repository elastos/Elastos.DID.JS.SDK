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

/* public class KeyPairTest {
	final static int KEY_SIZE = 1024;

	static {
	    Security.insertProviderAt(new org.spongycastle.jce.provider.BouncyCastleProvider(), 1);
	}

	//@Test
	public void RSAKeyPairTest() throws GeneralSecurityException, IOException {
		SecureRandom random = new SecureRandom();
		RSAKeyGenParameterSpec spec = new RSAKeyGenParameterSpec(KEY_SIZE, RSAKeyGenParameterSpec.F4);
		KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA", "SC");
		generator.initialize(spec, random);
		KeyPair kp = generator.generateKeyPair();
		Utils.dumpHex("PublicKey", kp.getPublic().getEncoded());
		Utils.dumpHex("PrivateKey", kp.getPrivate().getEncoded());

		RSAKeyPairGenerator keyGen = new RSAKeyPairGenerator();
		keyGen.init(new RSAKeyGenerationParameters(RSAKeyGenParameterSpec.F4, random, KEY_SIZE, 80));
		AsymmetricCipherKeyPair key = keyGen.generateKeyPair();

		SubjectPublicKeyInfo pi = SubjectPublicKeyInfoFactory.createSubjectPublicKeyInfo(key.getPublic());
		System.out.println(Base64.encodeToString(pi.getEncoded()));
		PrivateKeyInfo si = PrivateKeyInfoFactory.createPrivateKeyInfo(key.getPrivate());
		System.out.println(Base64.encodeToString(si.getEncoded()));

		PKCS8EncodedKeySpec pkcs8KeySpec = new PKCS8EncodedKeySpec(si.getEncoded());
		X509EncodedKeySpec spkiKeySpec = new X509EncodedKeySpec(pi.getEncoded());

		KeyFactory kf = KeyFactory.getInstance("RSA");
	    kp = new KeyPair(kf.generatePublic(spkiKeySpec), kf.generatePrivate(pkcs8KeySpec));

		Utils.dumpHex("PublicKey", kp.getPublic().getEncoded());
		Utils.dumpHex("PrivateKey", kp.getPrivate().getEncoded());
	}

	//@Test
	public void test1() throws DIDException, NoSuchAlgorithmException, InvalidKeySpecException, SignatureException, InvalidKeyException {
		byte[] input = "Hello World!".getBytes();

		for (int i = 0; i < 1000; i++) {
			HDKey key = TestData.generateKeypair();

			byte[] sig1 = key.sign(Sha256Hash.hash(input));
			System.out.println(Base64.encodeToString(sig1));

			KeyPair keyPair = key.getJCEKeyPair();
			Signature s = Signature.getInstance("SHA256withECDSA");
	        s.initSign(keyPair.getPrivate());
	        s.update(input);

	        byte[] sig2 = s.sign();
	        System.out.println(Base64.encodeToString(sig2));

	        System.out.println(key.verify(Sha256Hash.hash(input), sig2));

	        s = Signature.getInstance("SHA256withECDSA");
	        s.initVerify(keyPair.getPublic());
	        s.update(input);
	        System.out.println(s.verify(sig1));
		}
	}
}
 */