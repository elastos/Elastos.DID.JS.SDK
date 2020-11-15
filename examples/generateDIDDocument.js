const { ElastosClient } = require("../src");

let run = async () => {
    let mnemonic = "open improve window define excess party alone faint poem wedding item small";
    let didelement = await ElastosClient.did.loadFromMnemonic(mnemonic)

    console.log("didelement", didelement)

    let document = ElastosClient.tx.loadDIDDocumentFromDID(didelement.did)

    if (!document) {
        document = ElastosClient.didDocuments.newDIDDocument(didelement)
        document.id = "asdasdasd"
        console.log("document before seal", document)
        ElastosClient.didDocuments.sealDocument(didelement, document)
        console.log("document sealed", JSON.stringify(document))
    }
    
}

run()