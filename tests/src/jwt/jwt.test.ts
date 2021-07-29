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

import { DIDDocument,
        DIDDocumentBuilder,
        DIDURL,
        DIDStore,
        Logger,
        BASE64,
        JWT,
        JWTHeader,
        JWTBuilder,
        JWTParser,
        JWTParserBuilder,
        Claims
        } from "@elastosfoundation/did-js-sdk";
import { TestData } from "../utils/testdata";
import { TestConfig } from "../utils/testconfig";
import { DIDTestExtension } from "../utils/didtestextension";
import dayjs from "dayjs";

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

let testData: TestData;
let doc: DIDDocument;

describe('JWT Tests', () => {
    beforeEach(async () => {
        testData = new TestData();
        let identity = await testData.getRootIdentity();
        doc = await identity.newDid(TestConfig.storePass);
        let key = TestData.generateKeypair();
        let db = DIDDocumentBuilder.newFromDocument(doc).edit();
        let id = new DIDURL("#key2", doc.getSubject());
        db.addAuthenticationKey(id, key.getPublicKeyBase58());
        let store = await testData.getStore();
        store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
        doc = await db.seal(TestConfig.storePass);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();
    });

    afterAll(async () => {
        await testData.cleanup();
    });

    test('JWT Test', async () => {
        let h = JWTBuilder.createHeader();
        h.setType(JWTHeader.JWT_TYPE)
            .setContentType("json");
        h.put("library", "Elastos DID");
        h.put("version", "1.0");

        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let b = JWTBuilder.createClaims();
        b.setSubject("JwtTest")
            .setId("0")
            .setAudience("Test cases")
            .setIssuedAt(iat)
            .setExpiration(exp)
            .setNotBefore(nbf)
            .put("foo", "bar");

        let token = doc.jwtBuilder()
                .setHeader(h)
                .setClaims(b)
                .compact();

        expect(token).not.toBeNull();
        printJwt(token);

        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");
    });

    test('jwsTestSignWithDefaultKey', async () => {
        let h = JWTBuilder.createHeader();
        h.setType(JWTHeader.JWT_TYPE)
            .setContentType("json");
        h.put("library", "Elastos DID");
        h.put("version", "1.0");

        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let b = JWTBuilder.createClaims();
        b.setSubject("JwtTest")
            .setId("0")
            .setAudience("Test cases")
            .setIssuedAt(iat)
            .setExpiration(exp)
            .setNotBefore(nbf)
            .put("foo", "bar");

        let token = await doc.jwtBuilder()
                .setHeader(h)
                .setClaims(b)
                .sign(TestConfig.storePass);

        expect(token).not.toBeNull();
        printJwt(token);

        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");
    });

    test('jwsTestSignWithSpecificKey', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
				.addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setSubject("JwtTest")
                .setId("0")
                .setAudience("Test cases")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims("foo", "bar")
                .sign(TestConfig.storePass, "#key2");

        expect(token).not.toBeNull();
        printJwt(token);

        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");
    });

    test('jwsTestAutoVerify', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setSubject("JwtTest")
                .setId("0")
                .setAudience("Test cases")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims("foo", "bar")
                .sign(TestConfig.storePass, "#key2");

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");
    });

    /*function Map<String, Object> loadJson(String json) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            JsonNode node = mapper.readTree(json);
            return mapper.convertValue(node, new TypeReference<Map<String, Object>>(){});
        } catch (IOException e) {
            throw new IllegalArgumentException(e);
        }
    }*/

    test('jwsTestAutoVerify', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let vcEmail = ( await testData.getInstantData().getUser1Document()).getCredential("#email");

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setSubject("JwtTest")
                .setId("0")
                .setAudience("Test cases")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims("foo", "bar")
                .addClaims("vc", vcEmail.serialize(true))
                .sign(TestConfig.storePass, "#key2");

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");

        // get as map
        /*Class<Map<String, Object>> clazz = (Class)Map.class;
        Map<String, Object> map = c.get("vc", clazz);
        assertNotNull(map);
        assertEquals(vcEmail.getId().toString(), map.get("id"));
        assertTrue(map.equals(vc));

        // get as json text
        String json = c.getAsJson("vc");
        assertNotNull(json);
        assertTrue(loadJson(json).equals(vc));

        String s = jwt.getSignature();
        assertNotNull(s);*/
    });

    test('jwsTestClaimJsonText', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let vcPassport = await testData.getInstantData().getUser1PassportCredential();
        let jsonValue = vcPassport.serialize(true);

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setSubject("JwtTest")
                .setId("0")
                .setAudience("Test cases")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims("foo", "bar")
                .addClaims("vc", jsonValue) //with json(claimwithjson)
                .sign(TestConfig.storePass, "#key2");

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");

        /*Map<String, Object> vc = loadJson(jsonValue);

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
        assertNotNull(s);*/
    });

    test('jwsTestSetClaimWithJsonNode', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let json = "{\n" +
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

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .addClaims(m);
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .sign(TestConfig.storePass, "#key2");

        /*String token = doc.jwtBuilder()
                .addHeader(Header.TYPE, Header.JWT_TYPE)
                .addHeader(Header.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setClaims(m)
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .signWith("#key2", TestConfig.storePass)
                .compact();*/

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");

        // get as map
        /*@SuppressWarnings({ "rawtypes", "unchecked" })
        Class<Map<String, Object>> clazz = (Class)Map.class;
        Map<String, Object> map = c.get("object", clazz);
        assertNotNull(map);

        // get as json text
        String v = c.getAsJson("object");
        assertNotNull(v);

        String s = jwt.getSignature();
        assertNotNull(s);*/
    });

    test('jwsTestSetClaimWithJsonText', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let json = "{\n" +
                "  \"sub\":\"JwtTest\",\n" +
                "  \"jti\":\"0\",\n" +
                "  \"aud\":\"Test cases\",\n" +
                "  \"foo\":\"bar\",\n" +
                "  \"object\":{\n" +
                "    \"hello\":\"world\",\n" +
                "    \"test\":true\n" +
                "  }\n" +
                "}";

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .addClaims(json)
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .sign(TestConfig.storePass, "#key2");
        /*String token = doc.jwtBuilder()
                .addHeader(Header.TYPE, Header.JWT_TYPE)
                .addHeader(Header.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setClaimsWithJson(json)
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .signWith("#key2", TestConfig.storePass)
                .compact();*/

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");

        // get as map
        /*@SuppressWarnings({ "rawtypes", "unchecked" })
        Class<Map<String, Object>> clazz = (Class)Map.class;
        Map<String, Object> map = c.get("object", clazz);
        assertNotNull(map);

        // get as json text
        String v = c.getAsJson("object");
        assertNotNull(v);

        String s = jwt.getSignature();
        assertNotNull(s);*/
    });

    test('jwsTestAddClaimWithJsonNode', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let json = "{\n" +
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

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims(m)
                .sign(TestConfig.storePass, "#key2");
        /*String token = doc.jwtBuilder()
                .addHeader(Header.TYPE, Header.JWT_TYPE)
                .addHeader(Header.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims(m)
                .signWith("#key2", TestConfig.storePass)
                .compact();*/

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");

        // get as map
        /*@SuppressWarnings({ "rawtypes", "unchecked" })
        Class<Map<String, Object>> clazz = (Class)Map.class;
        Map<String, Object> map = c.get("object", clazz);
        assertNotNull(map);

        // get as json text
        String v = c.getAsJson("object");
        assertNotNull(v);

        String s = jwt.getSignature();
        assertNotNull(s);*/
    });

    test('jwsTestAddClaimWithJsonText', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let json = "{\n" +
                "  \"sub\":\"JwtTest\",\n" +
                "  \"jti\":\"0\",\n" +
                "  \"aud\":\"Test cases\",\n" +
                "  \"foo\":\"bar\",\n" +
                "  \"object\":{\n" +
                "    \"hello\":\"world\",\n" +
                "    \"test\":true\n" +
                "  }\n" +
                "}";

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims(json)
                .sign(TestConfig.storePass, "#key2");
        /*String token = doc.jwtBuilder()
                .addHeader(Header.TYPE, Header.JWT_TYPE)
                .addHeader(Header.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaimsWithJson(json)
                .signWith("#key2", TestConfig.storePass)
                .compact();*/

        expect(token).not.toBeNull();
        printJwt(token);

        // The JWT parser not related with a DID document
        let jp = doc.jwtParserBuilder().build();
        let jwt = await jp.parse(token);
        expect(jwt).not.toBeNull();

        let h = jwt.getHeader();
        expect(h).not.toBeNull();
        expect(h.getType()).toEqual(JWTHeader.JWT_TYPE);
        expect(h.getContentType()).toEqual("json");
        expect(h.get("library")).toEqual("Elastos DID");
        expect(h.get("version")).toEqual("1.0");

        let c = jwt.getBody();
        expect(c).not.toBeNull();
        expect(c.getSubject()).toEqual("JwtTest");
        expect(c.getId()).toEqual("0");
        expect(c.getIssuer()).toEqual(doc.getSubject().toString());
        expect(c.getAudience()).toEqual("Test cases");
        expect(c.getIssuedAt()).toBe(iat);
        expect(c.getExpiration()).toBe(exp);
        expect(c.getNotBefore()).toBe(nbf);
        expect(c.get("foo")).toEqual("bar");

        // get as map
        /*@SuppressWarnings({ "rawtypes", "unchecked" })
        Class<Map<String, Object>> clazz = (Class)Map.class;
        Map<String, Object> map = c.get("object", clazz);
        assertNotNull(map);

        // get as json text
        String v = c.getAsJson("object");
        assertNotNull(v);

        String s = jwt.getSignature();
        assertNotNull(s);*/
    });

    test('jwsTestExpiration', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(4, 'month').valueOf();

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setSubject("JwtTest")
                .setId("0")
                .setAudience("Test cases")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims("foo", "bar")
                .sign(TestConfig.storePass, "#key2");

        /*String token = doc.jwtBuilder()
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
                .compact();*/

        expect(token).not.toBeNull();
        printJwt(token);

        Thread.sleep(1000);

        // The JWT token is expired
        JwtParser jp = new JwtParserBuilder().build();
        assertThrows(ExpiredJwtException.class, () -> {
            jp.parseClaimsJws(token);
        });
    });
}
