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

import { DID, DIDURL, Exceptions } from "@elastosfoundation/did-js-sdk";

describe('DIDURL Tests', () => {
    const TEST_DID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	const TEST_PATH = "/path/to/the/test-%E6%B5%8B%E8%AF%95-2020/resource";
	const TEST_QUERY = "?qkey=qvalue&qkeyonly&hello=%E4%BD%A0%E5%A5%BD&test=true&a=%E5%95%8A";
	const TEST_FRAGMENT = "#testfragment";

	const WITH_DID : number = 0x01;
	const WITH_PATH : number = 0x02;
	const WITH_QUERY : number = 0x04;
	const WITH_FRAGMENT : number = 0x08;

    let  provideDIDURLs = [
        { spec : TEST_DID, part : WITH_DID },
        { spec : TEST_DID + TEST_PATH, part : WITH_DID | WITH_PATH },
        { spec : TEST_DID + TEST_QUERY, part : WITH_DID | WITH_QUERY },
        { spec : TEST_DID + TEST_FRAGMENT, part : WITH_DID | WITH_FRAGMENT },
        { spec : TEST_DID + TEST_PATH + TEST_FRAGMENT, part : WITH_DID | WITH_PATH | WITH_FRAGMENT },
        { spec : TEST_DID + TEST_QUERY + TEST_FRAGMENT, part : WITH_DID | WITH_QUERY | WITH_FRAGMENT },
        { spec : TEST_DID + TEST_PATH + TEST_QUERY, part : WITH_DID | WITH_PATH | WITH_QUERY },
        { spec : TEST_DID + TEST_PATH + TEST_QUERY + TEST_FRAGMENT, part : WITH_DID | WITH_PATH | WITH_QUERY | WITH_FRAGMENT },

        { spec : TEST_PATH, part : WITH_PATH },
        { spec : TEST_QUERY, part : WITH_QUERY },
        { spec : TEST_FRAGMENT, part : WITH_FRAGMENT },
        { spec : TEST_PATH + TEST_FRAGMENT, part : WITH_PATH | WITH_FRAGMENT },
        { spec : TEST_QUERY + TEST_FRAGMENT, part : WITH_QUERY | WITH_FRAGMENT },
        { spec : TEST_PATH + TEST_QUERY, part : WITH_PATH | WITH_QUERY },
        { spec : TEST_PATH + TEST_QUERY + TEST_FRAGMENT, part : WITH_PATH | WITH_QUERY | WITH_FRAGMENT },

        { spec : "  \n \t " + TEST_DID + "\t	\n", part : WITH_DID },
        { spec : "\t   \n" + TEST_DID + TEST_PATH + "  \n \t", part : WITH_DID | WITH_PATH },
        { spec : "   " + TEST_DID + TEST_QUERY + "\n", part : WITH_DID | WITH_QUERY },
        { spec : "\n" + TEST_DID + TEST_FRAGMENT + "	  ", part : WITH_DID | WITH_FRAGMENT },
        { spec : "\t" + TEST_DID + TEST_PATH + TEST_FRAGMENT + "  \n", part : WITH_DID | WITH_PATH | WITH_FRAGMENT },
        { spec : " " + TEST_DID + TEST_QUERY + TEST_FRAGMENT + "\t", part : WITH_DID | WITH_QUERY | WITH_FRAGMENT },
        { spec : "   " + TEST_DID + TEST_PATH + TEST_QUERY, part : WITH_DID | WITH_PATH | WITH_QUERY },
        { spec : TEST_DID + TEST_PATH + TEST_QUERY + TEST_FRAGMENT + "	  ", part : WITH_DID | WITH_PATH | WITH_QUERY | WITH_FRAGMENT },

        { spec : "  \t" + TEST_PATH + "	", part : WITH_PATH },
        { spec : " \n \t " + TEST_QUERY + "   \n", part : WITH_QUERY },
        { spec : "   " + TEST_FRAGMENT + "\t", part : WITH_FRAGMENT },
        { spec : " " + TEST_PATH + TEST_FRAGMENT + "	", part : WITH_PATH | WITH_FRAGMENT },
        { spec : "   " + TEST_QUERY + TEST_FRAGMENT, part : WITH_QUERY | WITH_FRAGMENT },
        { spec : TEST_PATH + TEST_QUERY + "  \n \t  ", part : WITH_PATH | WITH_QUERY },
        { spec : "   " + TEST_PATH + TEST_QUERY + TEST_FRAGMENT + " \n\t\t\n  ", part : WITH_PATH | WITH_QUERY | WITH_FRAGMENT }
    ];

    test('testDIDURL', () => {
        for (let didurl of provideDIDURLs) {
            let url = new DIDURL(didurl.spec);
            let refURLString = "";

            // getDid()
            if ((didurl.part & WITH_DID) == WITH_DID) {
                expect(url.getDid().equals(new DID(TEST_DID))).toBeTruthy();
                expect(url.getDid().toString()).toEqual(TEST_DID);

                refURLString = refURLString + TEST_DID;
            } else {
                expect(url.getDid()).toBeNull();
            }

            // getPath()
            if ((didurl.part & WITH_PATH) == WITH_PATH) {
                expect(url.getPath()).toEqual(TEST_PATH);

                refURLString = refURLString + TEST_PATH;
            } else {
                expect(url.getPath()).toBeNull();
            }

            // getQuery(), getQueryString(), getQueryParameter(), hasQueryParameter()
            if ((didurl.part & WITH_QUERY) == WITH_QUERY) {
                expect(url.getQueryString()).toEqual(TEST_QUERY.substring(1));
                expect(url.getQuery().size).toBe(5);

                expect(url.getQueryParameter("qkey")).toEqual("qvalue");
                expect(url.getQueryParameter("test")).toEqual("true");
                expect(decodeURIComponent(url.getQueryParameter("hello"))).toEqual("你好");
                expect(decodeURIComponent(url.getQueryParameter("a"))).toEqual("啊");
                expect(url.getQueryParameter("qkeyonly")).toBeNull();

                expect(url.hasQueryParameter("qkeyonly")).toBeTruthy();
                expect(url.hasQueryParameter("qkey")).toBeTruthy();
                expect(url.hasQueryParameter("test")).toBeTruthy();
                expect(url.hasQueryParameter("hello")).toBeTruthy();
                expect(url.hasQueryParameter("a")).toBeTruthy();
                expect(url.hasQueryParameter("notexist")).toBeFalsy();

                refURLString = refURLString + TEST_QUERY;
            } else {
                expect(url.getQueryString()).toBeNull();
                expect(url.getQuery().size).toBe(0);

                expect(url.getQueryParameter("qkey")).toBeNull();
                expect(url.hasQueryParameter("qkey")).toBeFalsy();
            }

            // getFragment()
            if ((didurl.part & WITH_FRAGMENT) == WITH_FRAGMENT) {
                expect(url.getFragment()).toEqual(TEST_FRAGMENT.substring(1));
                refURLString = refURLString + TEST_FRAGMENT;
            } else {
                expect(url.getFragment()).toBeNull();
            }

            let refURL = new DIDURL(refURLString);

            // toString()
            expect(url.toString()).toEqual(refURLString);

            // toString(DID)
            let pos = (didurl.part & WITH_DID) == WITH_DID ? TEST_DID.length : 0;
            expect(url.toString(DID.from(TEST_DID))).toEqual(refURLString.substring(pos));
            expect(url.toString(DID.from("did:elastos:abc"))).toEqual(refURLString);

            // equals()
            expect(url.equals(refURL)).toBeTruthy();
            expect(url.equals(refURLString)).toBeTruthy();

            let difURLString = refURLString + "_abc";
            let difURL = new DIDURL(difURLString);
            expect(url.equals(difURL)).toBeFalsy();
            expect(url.equals(difURLString)).toBeFalsy();

            // hashCode()
            expect(url.hashCode()).toEqual(refURL.hashCode());
            expect(url.hashCode()).toEqual(difURL.hashCode());
        }
	});

	test('testDIDURLWithContext', () => {
		let context = new DID("did:elastos:foobar");

        for (let didurl of provideDIDURLs) {
            let url = new DIDURL(didurl.spec, context);
            let refURLString = "";

            // getDid()
            if ((didurl.part & WITH_DID) == WITH_DID) {
                expect(url.getDid().equals(new DID(TEST_DID))).toBeTruthy();
                expect(url.getDid().toString()).toEqual(TEST_DID);

                refURLString = refURLString + TEST_DID;
            } else {
                expect(url.getDid().equals(context)).toBeTruthy();
                expect(url.getDid().toString()).toEqual(context.toString());

                refURLString = refURLString + context.toString();
            }

            // getPath()
            if ((didurl.part & WITH_PATH) == WITH_PATH) {
                expect(url.getPath()).toEqual(TEST_PATH);

                refURLString = refURLString + TEST_PATH;
            } else {
                expect(url.getPath()).toBeNull();
            }

            // getQuery(), getQueryString(), getQueryParameter(), hasQueryParameter()
            if ((didurl.part & WITH_QUERY) == WITH_QUERY) {
                expect(url.getQueryString()).toEqual(TEST_QUERY.substring(1));
                expect(url.getQuery().size).toBe(5);

                expect(url.getQueryParameter("qkey")).toEqual("qvalue");
                expect(url.getQueryParameter("test")).toEqual("true");
                expect(decodeURIComponent(url.getQueryParameter("hello"))).toEqual("你好");
                expect(decodeURIComponent(url.getQueryParameter("a"))).toEqual("啊");
                expect(url.getQueryParameter("qkeyonly")).toBeNull();

                expect(url.hasQueryParameter("qkeyonly")).toBeTruthy();
                expect(url.hasQueryParameter("qkey")).toBeTruthy();
                expect(url.hasQueryParameter("test")).toBeTruthy();
                expect(url.hasQueryParameter("hello")).toBeTruthy();
                expect(url.hasQueryParameter("a")).toBeTruthy();
                expect(url.hasQueryParameter("notexist")).toBeFalsy();

                refURLString = refURLString + TEST_QUERY;
            } else {
                expect(url.getQueryString()).toBeNull();
                expect(url.getQuery().size).toBe(0);

                expect(url.getQueryParameter("qkey")).toBeNull();
                expect(url.hasQueryParameter("qkey")).toBeFalsy();
            }

            // getFragment()
            if ((didurl.part & WITH_FRAGMENT) == WITH_FRAGMENT) {
                expect(url.getFragment()).toEqual(TEST_FRAGMENT.substring(1));
                refURLString = refURLString + TEST_FRAGMENT;
            } else {
                expect(url.getFragment()).toBeNull();
            }

            let refURL = new DIDURL(refURLString);

            // toString()
            expect(url.toString()).toEqual(refURLString);

            // toString(DID)
            if ((didurl.part & WITH_DID) == WITH_DID) {
                expect(url.toString(DID.from(TEST_DID))).toEqual(TEST_DID.length);
                expect(url.toString(context)).toEqual(refURLString);
            } else {
                expect(url.toString(context)).toEqual(refURLString.substring(context.toString().length);
                expect(url.toString(DID.from(TEST_DID))).toEqual(refURLString);
            }

            // equals()

            expect(url.equals(refURL)).toBeTruthy();
            expect(url.equals(refURLString)).toBeTruthy();

            let difURLString = refURLString + "_abc";
            let difURL = new DIDURL(difURLString);
            expect(url.equals(difURL)).toBeFalsy();
            expect(url.equals(difURLString)).toBeFalsy();

            // hashCode()
            expect(url.hashCode()).toEqual(refURL.hashCode());
            expect(url.hashCode()).toEqual(difURL.hashCode());
        }
	});

	test('testCompatibleWithPlainFragment', () => {
		let testURL = TEST_DID + "#test";

		let url1 = new DIDURL(testURL);
        expect(url1.toString()).toEqual(testURL);
        expect(url1.getFragment()).toEqual("test");
        expect(url1.equals(testURL)).toBeTruthy();

		let url2 = new DIDURL("test", DID.from(TEST_DID));
        expect(url2.toString()).toEqual(testURL);
        expect(url2.getFragment()).toEqual("test");
        expect(url2.equals(testURL)).toBeTruthy();

        expect(url1.equals(url2)).toBeTruthy();

		let url = new DIDURL("test");
        expect(url.toString()).toEqual("#test");
        expect(url.getFragment()).toEqual("test");
        expect(url.equals("#test")).toBeTruthy();
	});

	function trim(str : string) : string {
		let start = 0;
		let limit = str.length;

		// trim the leading and trailing spaces
		while ((limit > 0) && (str.charAt(limit - 1) <= ' '))
			limit--;		//eliminate trailing whitespace

		while ((start < limit) && (str.charAt(start) <= ' '))
			start++;		// eliminate leading whitespace

		return str.substring(start, limit);
	};

	test('testParseUrlWithSpecialChars', () => {
	    let specs = [
			"did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar#helloworld",
			"did:elastos:foobar/p.a_t-h/to-/resource_?te_st=tr_ue&ke.y=va_lue&na_me=foobar#helloworld_",
	  		"did:elastos:foobar/path_/to./resource_?test-=true.&ke.y_=va_lue.&name_=foobar.#helloworld_-.",
	  		"did:elastos:foobar/pa...th/to.../resource_-_?test-__.=true...&ke...y_---=va_lue.&name_=foo...bar.#helloworld_-.",
			"did:elastos:foobar/path/to/resou___rce?test=tr----ue&key=va----lue&name=foobar#hello....---world__",
        ];

        for (let spec of specs) {
            let url = new DIDURL(spec);

            expect(url.getDid().equals(new DID(DID.METHOD, "foobar"))).toBeTruthy();

            let urlString = trim(spec);
            expect(url.toString()).toEqual(urlString);
            expect(url.equals(urlString)).toBeTruthy();
        }
	});

	test('testParseWrongUrl', () => {
	    let checks = [
			{ spec : "did1:elastos:foobar/path/to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 4" },
			{ spec : "did:unknown:foobar/path/to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid did at: 0" },
			{ spec : "did:elastos:foobar:/path/to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid did at: 0" },
			{ spec : "did:elastos:foobar/-path/to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 19" },
			{ spec : "did:elastos:foobar/._path/to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 19" },
			{ spec : "did:elastos:foobar/-._path/to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 19" },
			{ spec : "did:elastos:foobar/path/-to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 24" },
			{ spec : "did:elastos:foobar/path/.to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 24" },
			{ spec : "did:elastos:foobar/path/_to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 24" },
			{ spec : "did:elastos:foobar/path/*to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 24" },
			{ spec : "did:elastos:foobar/path/$to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 24" },
			{ spec : "did:elastos:foobar/path./$to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 25" },
			{ spec : "did:elastos:foobar/path/%to/resource?test=true&key=value&name=foobar#helloworld", err : "Invalid hex char at: 25" },
			{ spec : "did:elastos:foobar/path/to//resource?test=true&key=value&name=foobar#helloworld", err : "Invalid char at: 27" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&&&key=value&name=foobar#helloworld", err : "Invalid char at: 46" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&_key=value&name=foobar#helloworld", err : "Invalid char at: 46" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&*key=value&name=foobar#helloworld", err : "Invalid char at: 46" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&-key=value&name=foobar#helloworld", err : "Invalid char at: 46" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true.&-key=value&name=foobar#helloworld", err : "Invalid char at: 47" },
			{ spec : "did:elastos:foobar/path/to/resource%20?test=true.&-key=value&name=foobar#helloworld", err : "Invalid char at: 50" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name==foobar#helloworld", err : "Invalid char at: 61" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name%=foobar#helloworld", err : "Invalid hex char at: 61" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=va--lue&name%=foobar#helloworld", err : "Invalid hex char at: 63" },
			{ spec : "did:elastos:foobar/path/to/resource?test=t.rue&ke.y=val_ue&nam-e=^foobar#helloworld", err : "Invalid char at: 65" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar*#helloworld", err : "Invalid char at: 67" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar?#helloworld", err : "Invalid char at: 67" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar##helloworld", err : "Invalid char at: 68" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar#helloworld*", err : "Invalid char at: 78" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar#helloworld&", err : "Invalid char at: 78" },
			{ spec : "did:elastos:foobar/path/to/resource?test=true&key=value&name=foobar#helloworld%", err : "Invalid char at: 78" },
        ];

        for (let check of checks) {
            expect(() => {
                new DIDURL(check.spec);
            }).rejects.toThrowError(check.err);
        };
	});

	test('testParseWrongUrlWithPadding', () => {
        expect(() => {
            new DIDURL("       \t did:elastos:foobar/-path/to/resource?test=true&key=value&name=foobar#helloworld");
        }).rejects.toThrowError("Invalid char at: 28");
	});

    test('testParseEmptyAndNull', () => {
        expect(() => {
            new DIDURL(null);
        }).rejects.toThrowError(Exceptions.IllegalArgumentException);

        expect(() => {
            new DIDURL("");
        }).rejects.toThrowError(Exceptions.IllegalArgumentException);

        expect(() => {
            new DIDURL("		   ");
        }).rejects.toThrowError("empty DIDURL string");
    });
});
