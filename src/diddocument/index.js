const {core} = require('../core')

const newDIDDocument = (didElement) =>{
    let document = {
    }
    core.setToJSON(document)
    
    core.addReadOnlyPropertyToObject(document, "id", didElement.did);
    core.addReadOnlyPropertyToObject(document, "publicKey", getPublicKeyProperty(didElement))
    core.addReadOnlyPropertyToObject(document, "authentication", [`${didElement.did}#primary`])
    document.verifiableCredential = []
    core.addReadOnlyPropertyToObject(document, "expires", getExpiration().toISOString().split('.')[0]+"Z")

    return document
}

const clone = document =>{
    //TODO: To copy a document and let modify
}

const addVerfiableCredentialToDIDDocument = (didElement, document, vc) =>{
    if (document.hasOwnProperty('proof'))
    {
        console.error("You can't modify this document because is already sealed")
        return
    }

    

    document.verifiableCredential.push(vc);
}

const createVerifiableCredential = (didElement, issuer, subjectName, subjectTypes, subjectValue) => {
    let vc = {}
    core.setToJSON(vc)
    let vcTypes = subjectTypes
    vcTypes.push(issuer === didElement.did ? "SelfProclaimedCredential" : "VerifiableCredential")
    
    let issuanceDate = new Date();

    let subject = {}
    core.setToJSON(subject)
    core.addReadOnlyPropertyToObject(subject, "id", didElement.did);
    core.addReadOnlyPropertyToObject(subject, subjectName, subjectValue);

    core.addReadOnlyPropertyToObject(vc, "id", `${didElement.did}#${subjectName}`);
    core.addReadOnlyPropertyToObject(vc, "type", vcTypes);
    core.addReadOnlyPropertyToObject(vc, "issuanceDate", issuanceDate.toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(vc, "expirationDate", getExpiration(issuanceDate).toISOString());
    core.addReadOnlyPropertyToObject(vc, "credentialSubject", subject);

    sign(didElement, vc)
    
    return vc
}

const sealDocument = (didElement, document) =>{
    if (document.hasOwnProperty('proof'))
    {
        console.error("You can't modify this document because is already sealed")
        return
    }

    let proof = {};
    core.setToJSON(proof)
    

    core.addReadOnlyPropertyToObject(proof, "type", "ECDSAsecp256r1");
    core.addReadOnlyPropertyToObject(proof, "created", new Date().toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(proof, "creator", `${didElement.did}#primary`);

    let dataToSign = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase()
    let signature = core.signData(dataToSign, didElement.privateKey);

    core.addReadOnlyPropertyToObject(proof, "signatureValue", signature);
    core.addReadOnlyPropertyToObject(document, "proof", proof);


    return document
}

const sign = (didElement, document) =>{
    let proof = {};
    core.setToJSON(proof)
    
    let dataToSign = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase()
    let signature = core.signData(dataToSign, didElement.privateKey);

    core.addReadOnlyPropertyToObject(proof, "signature", signature);
    core.addReadOnlyPropertyToObject(proof, "type", "ECDSAsecp256r1");
    core.addReadOnlyPropertyToObject(proof, "verificationMethod", `${didElement.did}#primary`);

    core.addReadOnlyPropertyToObject(document, "proof", proof);
}

const getExpiration = (date = new Date(), yearsToAdd = 5)=>{
    date.setFullYear(date.getFullYear() + yearsToAdd)
    return date
}

const getPublicKeyProperty = (didElement) =>{
    let publicKey = {}
    core.setToJSON(publicKey)

    core.addReadOnlyPropertyToObject(publicKey, "id", `${didElement.did}#primary`);
    core.addReadOnlyPropertyToObject(publicKey, "type", "ECDSAsecp256r1");
    core.addReadOnlyPropertyToObject(publicKey, "controller", didElement.did);
    core.addReadOnlyPropertyToObject(publicKey, "publicKeyBase58", didElement.publicKeyBase58);

    return [publicKey]
}

const isValid = (diddocument, didElement) => {
    let document = JSON.parse(JSON.stringify(diddocument))
    delete document.proof

    let dataToValidate = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase()
    return core.verifyData(dataToValidate, diddocument["proof"]["signatureValue"], didElement.publicKey)
}



module.exports.didDocuments = {
    newDIDDocument,
    createVerifiableCredential,
    addVerfiableCredentialToDIDDocument,
    sealDocument,
    isValid
}
