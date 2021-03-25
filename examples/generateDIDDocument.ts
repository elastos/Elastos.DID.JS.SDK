const { ElastosClient } = require("../dist");

let run = async () => {
    let mnemonic = "drink time ritual foam program sadness such inhale hurry supreme test forest";
    let didelement = await ElastosClient.did.loadFromMnemonic(mnemonic);
    let document = ElastosClient.didDocuments.newDIDDocument(didelement);

    let newDocument = ElastosClient.didDocuments.sealDocument(didelement, document);

    console.log(JSON.stringify(newDocument));
    console.log("Is Valid", ElastosClient.didDocuments.isValid(newDocument, didelement));
};

run();