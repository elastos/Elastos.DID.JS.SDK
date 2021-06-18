import { TestData } from "./utils/testdata";
import {
    DIDStore,
    RootIdentity,
    DIDRequest
} from "@elastosfoundation/did-js-sdk";
import { TestConfig } from "./utils/testconfig";



let testData: TestData;
let store: DIDStore;
let mnemonic: string;
let identity: RootIdentity;





// We use several describe() to force jest running test in a sequential order, as the below
// tests depend on each other.
describe('Assist Tests', () => {

    beforeAll(async () => {
        testData = new TestData();
        await testData.cleanup();
        await testData.getRootIdentity();
    });

    afterAll(async () => {
    });

    beforeEach(async () => {
        store = await testData.getStore();
        mnemonic = testData.getMnemonic();
        identity = await testData.getRootIdentity();
    });

    test('test publish new ', async () => {
        // Create new DID and publish to ID sidechain.

        try {
            let doc = await identity.newDid(TestConfig.storePass)
            console.log(doc.getDefaultPublicKeyId().toString())
            let request = await DIDRequest.create(doc, doc.getDefaultPublicKeyId(), TestConfig.storePass)
            let payload = await request.serialize(true);


            let data = {
                "didRequest": JSON.parse(payload),
                "requestFrom": "DID.JS.SDK",
                "did": doc.getDefaultPublicKeyId().toString(),
                "memo": ""
            }

            console.log(JSON.stringify(data))
        } catch (error) {
            console.log(error)
        }


    });

})