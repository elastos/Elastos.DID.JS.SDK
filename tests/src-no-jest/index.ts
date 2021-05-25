import { DIDStore } from "../../typings";
import { TestConfig } from "../src/utils/testconfig";
import { TestData } from "../src/utils/testdata";

let identity = new TestData().getRootIdentity();
let doc = identity.newDid(TestConfig.storePass);
console.log("END");