const { ElastosClient } = require("../src");

let run = async () => {
    let mnemonic = "drink time ritual foam program sadness such inhale hurry supreme test forest";
    let didelement = await ElastosClient.did.loadFromMnemonic(mnemonic);
    let document = ElastosClient.didDocuments.newDIDDocument(didelement);

    ElastosClient.didDocuments.sealDocument(didelement, document)

    console.log(JSON.stringify(document))
    console.log("Is Valid", ElastosClient.didDocuments.isValid(document, didelement))

    
    
}

run()