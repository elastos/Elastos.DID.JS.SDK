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

import { DID, Exceptions } from "@elastosfoundation/did-js-sdk";

describe('DID Tests', () => {
    const testMethodSpecificID = "icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
    const testDID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
    let did: DID;

    beforeEach(() => {
        did = new DID(testDID);
    });

    test('testDid', () => {
        const specs = [
            "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN",
            "     did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN",
            "    \n\t  did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN",
            "      did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN        ",
            "    \n \t  did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN     ",
            "\n\t     did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN \t  \n  ",
            "\t \n did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN     \n   \t",
            " \n \t\t did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN\t     \n   \t  ",
        ];
        const didString = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
        const methodSpecificId = "icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";

        // parse
        for (let spec of specs) {
            let did = new DID(spec);
            expect(did.getMethod()).toEqual(DID.METHOD);
            expect(did.getMethodSpecificId()).toEqual(methodSpecificId);
            expect(did.toString()).toEqual(didString);

            let ref = new DID(DID.METHOD, methodSpecificId);
            let dif = new DID(DID.METHOD, "abc");

            // equals
            expect(did.equals(didString)).toBeTruthy();
            expect(did.equals(ref)).toBeTruthy();
            expect(did.equals(dif)).toBeFalsy();

            // hash code
            expect(did.hashCode()).toBe(ref.hashCode());
            expect(did.hashCode()).not.toBe(dif.hashCode());
        }
    });

    test('testParseDidWithSpecialChars', () => {
        let csvsource = [
            { spec : "did:elastos:ic-J4_z2D.ULrHEzYSvjKNJpKyhqFDxvYV7pN", methodSpecificId : "ic-J4_z2D.ULrHEzYSvjKNJpKyhqFDxvYV7pN" },
            { spec : "did:elastos:icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-", methodSpecificId : "icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-" },
            { spec : "did:elastos:icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-_", methodSpecificId : "icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-_" },
            { spec : "did:elastos:icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-_.", methodSpecificId : "icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-_." },
            { spec : "did:elastos:icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-_.-", methodSpecificId : "icJ.4z2D.ULrHE.zYSvj-KNJp_KyhqFDxvYV7pN-_.-" }
        ];

        for (let source of csvsource) {
            let did = new DID(source.spec);
            expect(did.getMethod()).toEqual(DID.METHOD);
            expect(did.getMethodSpecificId()).toEqual(source.methodSpecificId);
            expect(did.toString()).toEqual(source.spec);
        }
    });

    test('testParseWrongDid', () => {
        let checks = [
            { value : "did1:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid DID schema: 'did1', at: 0" },
            { value : "d-i_d:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid DID schema: 'd-i_d', at: 0" },
            { value : "d-i.d:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid DID schema: 'd-i.d', at: 0" },
            { value : "foo:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid DID schema: 'foo', at: 0" },
            { value : "foo:bar:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid DID schema: 'foo', at: 0" },
            { value : "did:bar:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Unknown DID method: 'bar', at: 4" },
            { value : "did:elastos-:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Unknown DID method: 'elastos-', at: 4" },
            { value : "did:e-l.a_stos-:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Unknown DID method: 'e-l.a_stos-', at: 4" },
            { value : "-did:elastos:icJ4z2%DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 0" },
            { value : ".did:elastos:icJ4z2%DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 0" },
            { value : "_did:elastos:icJ4z2%DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 0" },
            { value : "did :elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 3" },
            { value : "did: elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 4" },
            { value : "did:-elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 4" },
            { value : "did:_elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 4" },
            { value : "did:.elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 4" },
            { value : "did:*elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 4" },
            { value : "did:/elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 4" },
            { value : "did:ela*stos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 7" },
            { value : "did:elastos\t:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 11" },
            { value : "did:elastos: icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 12" },
            { value : "did:elastos:-icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 12" },
            { value : "did:elastos:_icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 12" },
            { value : "did:elastos:.icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 12" },
            { value : "did:elastos:icJ4z2%DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid char at: 18" },
            { value : "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN$", err : "Invalid char at: 46" },
            { value : ":elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Invalid DID schema: '', at: 0" },
            { value : "did::icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN", err : "Unknown DID method: '', at: 4" },
            { value : "did:elastos:", err : "Missing id string at: 12" },
            { value : "did:elastos", err : "Missing id string at: 11" },
            { value : "did:elastos:abc: ", err : "Invalid char at: 15" }
        ];

        for (let check of checks) {
            expect(() => {
                new DID(check.value);
            }).toThrowError(check.err);
        };
     });

    test('testParseWrongDidWithPadding', () => {
        expect(() => {
            new DID("   d-i.d:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN");
        }).toThrowError("Invalid DID schema: 'd-i.d', at: 3");
    });

    test('testParseEmptyAndNull', () => {
        expect(() => {
            new DID(null);
        }).toThrowError();

        expect(() => {
            new DID("");
        }).toThrowError();

        expect(() => {
            new DID("		   ");
        }).toThrowError("Empty DID string");
    });
});