const { ElastosClient } = require("../dist");

let run = async () => {


    let isValid = true;
    let count = 0;
    while (isValid) {
        count ++;
        console.log(count);
        let didelement = await ElastosClient.did.loadFromMnemonic("drink time ritual foam program sadness such inhale hurry supreme test forest");
        let document = ElastosClient.didDocuments.newDIDDocument(didelement);
        let newDocument = ElastosClient.didDocuments.sealDocument(didelement, document);
        isValid = ElastosClient.didDocuments.isValid(newDocument, didelement);
        if (!isValid) {
            console.log("Not Valid");
            console.log(JSON.stringify(newDocument));
            console.log(didelement);
        }
    }
};

run();