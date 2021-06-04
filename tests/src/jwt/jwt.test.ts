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

import { DIDDocument, RootIdentity, HDKey, DIDDocumentBuilder, DIDURL, DIDStore, Logger, BASE64 } from "@elastosfoundation/did-js-sdk";
import { TestData } from "../utils/testdata";
import { TestConfig } from "../utils/testconfig";
import { DIDTestExtension } from "../utils/didtestextension";

const logger = new Logger("JWTTests");

function printJwt(token: string) {
	if (Logger.getLevel() >= Logger.TRACE) {
		let toks = token.split("\\.");

		if (toks.length != 2 && toks.length != 3) {
			logger.error("Invalid token: " + token);
			return;
		}

		let sb = BASE64.decode(toks[0]) + '.' + BASE64.decode(toks[1]) + '.';
		if (toks.length == 3)
			sb += toks[2];

		logger.trace("Token: {}", token);
		logger.trace("Plain: {}", sb.toString());
	}
}

describe('JWT Tests', () => {
	const testMethodSpecificID = "icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	const testDID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	let testData: TestData;
	let identity: RootIdentity;
	let doc: DIDDocument;
	let key: HDKey;
	let db: DIDDocumentBuilder;
	let id: DIDURL;
	let store: DIDStore;

	beforeEach(async () => {
		testData = new TestData();
		await testData.cleanup();
		identity = testData.getRootIdentity();
		doc = await identity.newDid(TestConfig.storePass);
		key = TestData.generateKeypair();
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		id = new DIDURL("#key2", doc.getSubject());
		db.addAuthenticationKey(id, key.getPublicKeyBase58());
		store = await testData.getStore();
		store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
		doc = await db.seal(TestConfig.storePass);
		await store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
	    await DIDTestExtension.awaitStandardPublishingDelay();
	});

	afterAll(async () => {
	});
/*
	test('JWT Test', () => {
		Header h = JwtBuilder.createHeader();
		h.setType(Header.JWT_TYPE)
			.setContentType("json");
		h.put("library", "Elastos DID");
		h.put("version", "1.0");

		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		Claims b = JwtBuilder.createClaims();
		b.setSubject("JwtTest")
			.setId("0")
			.setAudience("Test cases")
			.setIssuedAt(iat)
			.setExpiration(exp)
			.setNotBefore(nbf)
			.put("foo", "bar");

		String token = doc.jwtBuilder()
				.setHeader(h)
				.setClaims(b)
				.compact();

		assertNotNull(token);
		printJwt(token);

		JwtParser jp = doc.jwtParserBuilder().build();
		Jwt<Claims> jwt = jp.parseClaimsJwt(token);
		assertNotNull(jwt);

		h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));
	});

	test('Test Constructor with invalid did string', () => {
		expect(() =>{ new DID("id:elastos:1234567890")}).toThrowError()
		expect(() =>{ new DID("did:example:1234567890")}).toThrowError()
		expect(() =>{ new DID("did:elastos:")}).toThrowError()
	});
	*/
});

/*
	@Test
	public void jwtTest()
			throws DIDException, IOException, JwtException {
		Header h = JwtBuilder.createHeader();
		h.setType(Header.JWT_TYPE)
			.setContentType("json");
		h.put("library", "Elastos DID");
		h.put("version", "1.0");

		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		Claims b = JwtBuilder.createClaims();
		b.setSubject("JwtTest")
			.setId("0")
			.setAudience("Test cases")
			.setIssuedAt(iat)
			.setExpiration(exp)
			.setNotBefore(nbf)
			.put("foo", "bar");

		String token = doc.jwtBuilder()
				.setHeader(h)
				.setClaims(b)
				.compact();

		assertNotNull(token);
		printJwt(token);

		JwtParser jp = doc.jwtParserBuilder().build();
		Jwt<Claims> jwt = jp.parseClaimsJwt(token);
		assertNotNull(jwt);

		h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));
	}

	@Test
	public void jwsTestSignWithDefaultKey()
			throws DIDException, IOException, JwtException {
		JwsHeader h = JwtBuilder.createJwsHeader();
		h.setType(Header.JWT_TYPE)
			.setContentType("json");
		h.put("library", "Elastos DID");
		h.put("version", "1.0");

		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		Claims b = JwtBuilder.createClaims();
		b.setSubject("JwtTest")
			.setId("0")
			.setAudience("Test cases")
			.setIssuedAt(iat)
			.setExpiration(exp)
			.setNotBefore(nbf)
			.put("foo", "bar");

		String token = doc.jwtBuilder()
				.setHeader(h)
				.setClaims(b)
				.sign(TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		JwtParser jp = doc.jwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestSignWithSpecificKey()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setSubject("JwtTest")
				.setId("0")
				.setAudience("Test cases")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.claim("foo", "bar")
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		JwtParser jp = doc.jwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestAutoVerify()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setSubject("JwtTest")
				.setId("0")
				.setAudience("Test cases")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.claim("foo", "bar")
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestClaimJsonNode()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		VerifiableCredential vcEmail = testData.getInstantData().getUser1Document().getCredential("#email");

		Map<String, Object> vc = loadJson(vcEmail.serialize(true));

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setSubject("JwtTest")
				.setId("0")
				.setAudience("Test cases")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.claim("foo", "bar")
				.claim("vc", vc)
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		// get as map
		@SuppressWarnings({ "rawtypes", "unchecked" })
		Class<Map<String, Object>> clazz = (Class)Map.class;
		Map<String, Object> map = c.get("vc", clazz);
		assertNotNull(map);
		assertEquals(vcEmail.getId().toString(), map.get("id"));
		assertTrue(map.equals(vc));

		// get as json text
		String json = c.getAsJson("vc");
		assertNotNull(json);
		assertTrue(loadJson(json).equals(vc));

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestClaimJsonText()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		VerifiableCredential vcPassport = testData.getInstantData().getUser1PassportCredential();
		String jsonValue = vcPassport.serialize(true);

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setSubject("JwtTest")
				.setId("0")
				.setAudience("Test cases")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.claim("foo", "bar")
				.claimWithJson("vc", jsonValue)
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		Map<String, Object> vc = loadJson(jsonValue);

		// get as map
		@SuppressWarnings({ "rawtypes", "unchecked" })
		Class<Map<String, Object>> clazz = (Class)Map.class;
		Map<String, Object> map = c.get("vc", clazz);
		assertNotNull(map);
		assertEquals(vcPassport.getId().toString(), map.get("id"));
		assertTrue(map.equals(vc));

		// get as json text
		String json = c.getAsJson("vc");
		assertNotNull(json);
		assertTrue(loadJson(json).equals(vc));

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestSetClaimWithJsonNode()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		String json = "{\n" +
				"  \"sub\":\"JwtTest\",\n" +
				"  \"jti\":\"0\",\n" +
				"  \"aud\":\"Test cases\",\n" +
				"  \"foo\":\"bar\",\n" +
				"  \"object\":{\n" +
				"    \"hello\":\"world\",\n" +
				"    \"test\":true\n" +
				"  }\n" +
				"}";

		Map<String, Object> m = loadJson(json);

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setClaims(m)
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		// get as map
		@SuppressWarnings({ "rawtypes", "unchecked" })
		Class<Map<String, Object>> clazz = (Class)Map.class;
		Map<String, Object> map = c.get("object", clazz);
		assertNotNull(map);

		// get as json text
		String v = c.getAsJson("object");
		assertNotNull(v);

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestSetClaimWithJsonText()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		String json = "{\n" +
				"  \"sub\":\"JwtTest\",\n" +
				"  \"jti\":\"0\",\n" +
				"  \"aud\":\"Test cases\",\n" +
				"  \"foo\":\"bar\",\n" +
				"  \"object\":{\n" +
				"    \"hello\":\"world\",\n" +
				"    \"test\":true\n" +
				"  }\n" +
				"}";

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setClaimsWithJson(json)
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		// get as map
		@SuppressWarnings({ "rawtypes", "unchecked" })
		Class<Map<String, Object>> clazz = (Class)Map.class;
		Map<String, Object> map = c.get("object", clazz);
		assertNotNull(map);

		// get as json text
		String v = c.getAsJson("object");
		assertNotNull(v);

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestAddClaimWithJsonNode()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		String json = "{\n" +
				"  \"sub\":\"JwtTest\",\n" +
				"  \"jti\":\"0\",\n" +
				"  \"aud\":\"Test cases\",\n" +
				"  \"foo\":\"bar\",\n" +
				"  \"object\":{\n" +
				"    \"hello\":\"world\",\n" +
				"    \"test\":true\n" +
				"  }\n" +
				"}";

		Map<String, Object> m = loadJson(json);

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.addClaims(m)
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		// get as map
		@SuppressWarnings({ "rawtypes", "unchecked" })
		Class<Map<String, Object>> clazz = (Class)Map.class;
		Map<String, Object> map = c.get("object", clazz);
		assertNotNull(map);

		// get as json text
		String v = c.getAsJson("object");
		assertNotNull(v);

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestAddClaimWithJsonText()
			throws DIDException, IOException, JwtException {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 4);
		Date exp = cal.getTime();

		String json = "{\n" +
				"  \"sub\":\"JwtTest\",\n" +
				"  \"jti\":\"0\",\n" +
				"  \"aud\":\"Test cases\",\n" +
				"  \"foo\":\"bar\",\n" +
				"  \"object\":{\n" +
				"    \"hello\":\"world\",\n" +
				"    \"test\":true\n" +
				"  }\n" +
				"}";

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.addClaimsWithJson(json)
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		// The JWT parser not related with a DID document
		JwtParser jp = new JwtParserBuilder().build();
		Jws<Claims> jwt = jp.parseClaimsJws(token);
		assertNotNull(jwt);

		JwsHeader h = jwt.getHeader();
		assertNotNull(h);
		assertEquals("json", h.getContentType());
		assertEquals(Header.JWT_TYPE, h.getType());
		assertEquals("Elastos DID", h.get("library"));
		assertEquals("1.0", h.get("version"));

		Claims c = jwt.getBody();
		assertNotNull(c);
		assertEquals("JwtTest", c.getSubject());
		assertEquals("0", c.getId());
		assertEquals(doc.getSubject().toString(), c.getIssuer());
		assertEquals("Test cases", c.getAudience());
		assertEquals(iat, c.getIssuedAt());
		assertEquals(exp, c.getExpiration());
		assertEquals(nbf, c.getNotBefore());
		assertEquals("bar", c.get("foo", String.class));

		// get as map
		@SuppressWarnings({ "rawtypes", "unchecked" })
		Class<Map<String, Object>> clazz = (Class)Map.class;
		Map<String, Object> map = c.get("object", clazz);
		assertNotNull(map);

		// get as json text
		String v = c.getAsJson("object");
		assertNotNull(v);

		String s = jwt.getSignature();
		assertNotNull(s);
	}

	@Test
	public void jwsTestExpiration() throws Exception {
		Calendar cal = Calendar.getInstance();
		cal.set(Calendar.MILLISECOND, 0);
		Date iat = cal.getTime();
		cal.add(Calendar.MONTH, -1);
		Date nbf = cal.getTime();
		cal.add(Calendar.MONTH, 1);
		Date exp = cal.getTime();

		String token = doc.jwtBuilder()
				.addHeader(Header.TYPE, Header.JWT_TYPE)
				.addHeader(Header.CONTENT_TYPE, "json")
				.addHeader("library", "Elastos DID")
				.addHeader("version", "1.0")
				.setSubject("JwtTest")
				.setId("0")
				.setAudience("Test cases")
				.setIssuedAt(iat)
				.setExpiration(exp)
				.setNotBefore(nbf)
				.claim("foo", "bar")
				.signWith("#key2", TestConfig.storePass)
				.compact();

		assertNotNull(token);
		printJwt(token);

		Thread.sleep(1000);

		// The JWT token is expired
		JwtParser jp = new JwtParserBuilder().build();
		assertThrows(ExpiredJwtException.class, () -> {
			jp.parseClaimsJws(token);
		});
	}

	private Map<String, Object> loadJson(String json) {
		ObjectMapper mapper = new ObjectMapper();
		try {
			JsonNode node = mapper.readTree(json);
			return mapper.convertValue(node, new TypeReference<Map<String, Object>>(){});
		} catch (IOException e) {
			throw new IllegalArgumentException(e);
		}
	}
}
 */