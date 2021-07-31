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
import { stringify } from "querystring";
import { exception } from "console";

const logger = new Logger("JWTTests");

function printJwt(token: string) {
    if (Logger.getLevel() >= Logger.TRACE) {
        let toks = token.split(".");

        if (toks.length != 3) {
            logger.error("Invalid token: " + token);
            return;
        }

        let sb = BASE64.toString(toks[0]) + '.' + BASE64.toString(toks[1]) + '.';
        if (toks[2] != "")
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
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
        expect(h.getAlgorithm()).toEqual("none");
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
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
                .claims("foo", "bar")
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
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
                .claims("foo", "bar")
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

    test('jwsTestAutoVerify', async () => {
        let cal = dayjs();
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

        let vcEmail = ( await testData.getInstantData().getUser1Document()).getCredential("#email");
        let jsonValue = vcEmail.serialize(true);
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
                .claims("foo", "bar")
                .claims("vc", JSON.parse(jsonValue))
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

        let vccontent = c.get("vc");
        expect(vcEmail.getId().toString()).toEqual(vccontent.get("id"));
        expect(stringify(vccontent)).toEqual(jsonValue);
    });

    test('jwsTestClaimJsonText', async () => {
        let cal = dayjs();
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
                .claims("foo", "bar")
                .claimsWithJson("vc", jsonValue) //with json(claimwithjson)
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

        let vccontent = c.get("vc");
        expect(vcPassport.getId().toString()).toEqual(vccontent.get("id"));
        expect(stringify(vccontent)).toEqual(jsonValue);

        // get as json text
        let json = c.getAsJson("vc");
        expect(json).not.toBeNull();
        expect(json).toEqual(jsonValue);
    });

    test('jwsTestSetClaimWithJsonNode', async () => {
        let cal = dayjs();
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
                .setClaims(JSON.parse(json))
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
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

        let object = c.get("object");
        expect(object).not.toBeNull();

        // get as json text
        let v = c.getAsJson("object");
        expect(v).not.toBeNull();
    });

    test('jwsTestSetClaimWithJsonText', async () => {
        let cal = dayjs();
        let iat = cal.unix();
        let nbf = cal.add(-1, 'month').unix();
        let exp = cal.add(4, 'month').unix();

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
                .setClaimsWithJson(json)
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
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

        let object = c.get("object");
        expect(object).not.toBeNull();

        // get as json text
        let v = c.getAsJson("object");
        expect(v).not.toBeNull();
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

        let token = await doc.jwtBuilder()
                .addHeader(JWTHeader.TYPE, JWTHeader.JWT_TYPE)
                .addHeader(JWTHeader.CONTENT_TYPE, "json")
                .addHeader("library", "Elastos DID")
                .addHeader("version", "1.0")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setNotBefore(nbf)
                .addClaims(JSON.parse(json))
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

        let object = c.get("object");
        expect(object).not.toBeNull();

        // get as json text
        let v = c.getAsJson("object");
        expect(v).not.toBeNull();
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
                .addClaimsWithJson(json)
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

        let object = c.get("object");
        expect(object).not.toBeNull();

        // get as json text
        let v = c.getAsJson("object");
        expect(v).not.toBeNull();
    });

    test('jwsTestExpiration', async () => {
        let cal = dayjs();
        cal.millisecond(0);
        let iat = cal.valueOf();
        let nbf = cal.add(-1, 'month').valueOf();
        let exp = cal.add(1, 'month').valueOf();

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
                .claims("foo", "bar")
                .sign(TestConfig.storePass, "#key2");

        expect(token).not.toBeNull();
        printJwt(token);

        //Thread.sleep(5000);

        // The JWT token is expired
        /*let jp = new JwtParserBuilder().build();
        assertThrows(ExpiredJwtException.class, () -> {
            jp.parseClaimsJws(token);
        });*/
    });
})

