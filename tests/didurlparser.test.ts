import { DIDURLParser, DIDURLValues } from "../dist/did"

describe('DIDURL Tests', () => {
	let testDID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	let params = ";elastos:foo=testvalue;bar=123;keyonly;elastos:foobar=12345";
	let path = "/path/to/the/resource";
	let query = "?qkey=qvalue&qkeyonly&test=true";
	let fragment = "#testfragment";
	let testURL = testDID + params + path + query + fragment;
	let urlParsed: DIDURLValues;
	

	beforeEach(()=>{
		urlParsed = DIDURLParser.NewFromURL(testURL)
	})

	test('Test parse DID', () => {
		expect(urlParsed.did.value).toBe(testDID)
        expect(urlParsed.did.method).toBe("elastos")
        expect(urlParsed.did.methodSpecificId).toBe("icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN")
	});

    test('Test parse params', () => {
        expect(urlParsed.params.has("elastos:foo")).toBeTruthy()
		expect(urlParsed.params.has("bar")).toBeTruthy()
		expect(urlParsed.params.has("keyonly")).toBeTruthy()
		expect(urlParsed.params.has("elastos:foobar")).toBeTruthy()
		expect(urlParsed.params.get("elastos:foo")).toBe("testvalue")
		expect(urlParsed.params.get("keyonly")).toBe(null)
    })
    test('Test parse path', () => {
        expect(urlParsed.path).toBe(path)
    })

    test('Test parse query', () => {
        expect(urlParsed.query.has("qkey")).toBeTruthy()
		expect(urlParsed.query.has("qkeyonly")).toBeTruthy()
		expect(urlParsed.query.has("test")).toBeTruthy()
		expect(urlParsed.query.get("qkey")).toBe("qvalue")
		expect(urlParsed.query.get("qkeyonly")).toBe(null)
    })

    test('Test parse fragment', () => {
        expect(urlParsed.fragment).toBe("testfragment")
    })


})