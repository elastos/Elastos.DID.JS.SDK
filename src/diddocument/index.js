const {core} = require('../core')

const newDIDDocument = (didElement) =>{
    let document = {
    }
    core.setToJSON(document)

    
    core.addReadOnlyPropertyToObject(document, "id", didElement.did);
    core.addReadOnlyPropertyToObject(document, "publicKey", getPublicKeyProperty(didElement))
    core.addReadOnlyPropertyToObject(document, "authentication", [`${didElement.did}#primary`])
    document.verifiableCredential = [];
    document.verifiablePresentation = [];
    core.addReadOnlyPropertyToObject(document, "expires", getExpiration().toISOString().split('.')[0]+"Z")

    return document
}

const clone = document =>{
    //TODO: To copy a document and let modify
}

const addVerfiableCredentialToDIDDocument = (document, vc) =>{
    if (document.hasOwnProperty('proof'))
    {
        console.error("You can't modify this document because is already sealed")
        return
    }

    
    if (!document.verifiableCredential) document.verifiableCredential = []
    document.verifiableCredential.push(vc);


}

const addVerfiablePresentationToDIDDocument = (document, vp) =>{
    if (document.hasOwnProperty('proof'))
    {
        console.error("You can't modify this document because is already sealed")
        return
    }
    if (!document.verifiablePresentation) document.verifiablePresentation = []
    document.verifiablePresentation.push(vp);


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
    core.addReadOnlyPropertyToObject(vc, "issuer", issuer);
    core.addReadOnlyPropertyToObject(vc, "issuanceDate", issuanceDate.toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(vc, "expirationDate", getExpiration(issuanceDate).toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(vc, "credentialSubject", subject);

    sign(didElement, vc)
    
    return vc
}


const createVerifiableCredentialVP = (appDid, userDid, appName) => {
    let vc = {}
    core.setToJSON(vc)
    let vcTypes = ["AppIdCredential"]
    
    let issuanceDate = new Date();

    let subject = {}
    core.setToJSON(subject)
    core.addReadOnlyPropertyToObject(subject, "id", appDid.did);
    core.addReadOnlyPropertyToObject(subject, "appDid", appName);
    core.addReadOnlyPropertyToObject(subject, "appInstanceDid", appDid.did);
    
    

    core.addReadOnlyPropertyToObject(vc, "id", `${appDid.did}#app-id-credential`);
    core.addReadOnlyPropertyToObject(vc, "type", vcTypes);
    core.addReadOnlyPropertyToObject(vc, "issuer", userDid.did);
    core.addReadOnlyPropertyToObject(vc, "issuanceDate", issuanceDate.toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(vc, "expirationDate", getExpiration(issuanceDate).toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(vc, "credentialSubject", subject);

    sign(userDid, vc)
    return vc
}

const createVerifiablePresentation = (didElement, type, verifiableCredential, realm, nonce) => {
    let vp = {}
    core.setToJSON(vp)
        
    let createDate = new Date();

   

    core.addReadOnlyPropertyToObject(vp, "type", type);
    core.addReadOnlyPropertyToObject(vp, "created", createDate.toISOString().split('.')[0]+"Z");
    core.addReadOnlyPropertyToObject(vp, "verifiableCredential", [verifiableCredential]);
    
    signVp(didElement, vp, realm, nonce)
    return vp
}

const sealDocument = (didElement, document) =>{
    if (document.hasOwnProperty('proof'))
    {
        console.error("You can't modify this document because is already sealed")
        return
    }

    let proof = {};
    core.setToJSON(proof)

    
    if (document.verifiableCredential && document.verifiableCredential.length === 0)  delete document.verifiableCredential;
    if (document.verifiablePresentation && document.verifiablePresentation.length === 0) delete document.verifiablePresentation;

    

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

    
    core.addReadOnlyPropertyToObject(proof, "type", "ECDSAsecp256r1");
    core.addReadOnlyPropertyToObject(proof, "verificationMethod", `${didElement.did}#primary`);
    core.addReadOnlyPropertyToObject(proof, "signature", signature);

    core.addReadOnlyPropertyToObject(document, "proof", proof);
}

const signVp = (didElement, document, realm, nonce) =>{
    let proof = {};
    core.setToJSON(proof)

    let json = JSON.stringify(document, null, "");

    let dataToSign = Buffer.from(json + realm + nonce, "utf8").toString("hex").toUpperCase()
    let signature = core.signData(dataToSign, didElement.privateKey);

    
    core.addReadOnlyPropertyToObject(proof, "type", "ECDSAsecp256r1");
    core.addReadOnlyPropertyToObject(proof, "verificationMethod", `${didElement.did}#primary`);
    core.addReadOnlyPropertyToObject(proof, "realm", realm);
    core.addReadOnlyPropertyToObject(proof, "nonce", nonce);
    core.addReadOnlyPropertyToObject(proof, "signature", signature);

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

const isValid = (diddocument, didElement, propertyName = "signatureValue") => {

    let document = JSON.parse(JSON.stringify(diddocument))
    

    delete document.proof

    

    let dataToValidate = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase()

    return core.verifyData(dataToValidate, diddocument["proof"][propertyName], didElement.publicKey)
}



module.exports.didDocuments = {
    newDIDDocument,
    createVerifiableCredential,
    createVerifiableCredentialVP,
    createVerifiablePresentation,
    addVerfiableCredentialToDIDDocument,
    addVerfiablePresentationToDIDDocument,
    sealDocument,
    isValid
}
