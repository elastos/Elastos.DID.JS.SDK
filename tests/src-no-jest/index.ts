import { DIDStore } from "../../typings";
import { TestConfig } from "../src/utils/testconfig";
import { TestData } from "../src/utils/testdata";

let identity = await (await TestData.create()).getRootIdentity();
let doc = await identity.newDid(TestConfig.storePass);
console.log("END");