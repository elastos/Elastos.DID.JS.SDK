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


const getMostRecentDIDDocument = async (did, options = {}) =>{
    let elastosRPCHost = "http://api.elastos.io:20606"
    let useCache =  true

    console.log("Enter on getMostRecentDIDDocument", did, options)

    if (options && "elastosRPCHost" in options) elastosRPCHost = options["elastosRPCHost"]
    if (options && "useCache" in options) useCache = options["useCache"]
    
    console.log("Parameter elastos host", elastosRPCHost)
    console.log("Parameter use cache   ", useCache)

    if (!did) throw new Error("Invalid DID")

    let searchDid = did.replace("did:elastos:", "")

    if (useCache){
        let found = searchDIDDocumentOnCache(searchDid)
        if (found) return found
    }
    
    
    let document = await searchDIDDocumentOnBlockchain(searchDid, elastosRPCHost)
    if (!document) return undefined
    
    if (useCache) setDIDDocumentOnCache(searchDid, document)

    return document
}

const setDIDDocumentOnCache = (did, diddocument) =>{
    console.log("Enter on setDIDDocumentOnCache", did, diddocument)
    let storage = window.localStorage //?? localStorage
    let cache = storage.key["elastos_cache"]
    if (!cache){
        cache = {}
    }


    clearExpiredCacheItems(cache)

    cache[did] = {
        "expiration": core.getTimestamp() + (5 * 60),  //Five minutes cache
        "document": diddocument
    }




    console.log("store cache", cache)

    storage.setItem("elastos_cache", JSON.stringify(cache))
}

const clearExpiredCacheItems = (cache) =>{
    var keys = Object.keys(cache);
    let timestamp = core.getTimestamp()
    for (var i = 0; i < keys.length; i++) {
        if (timestamp > obj[keys[i]]["expiration"]) delete obj[keys[i]]
    }
}

const searchDIDDocumentOnBlockchain = async (did, rpcHost) =>{
    console.log("Enter on searchDIDDocumentOnBlockchain", did, rpcHost)
    let body = {
        "jsonrpc": '2.0',
        "id": "1",
        "method": "resolvedid",
        "params": {
            "did": did,
            "all": true
        }
    }

    let rpcResponse = await fetch(rpcHost, {
        "method": "POST",
        "header": {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        "body": JSON.stringify(body)
    })

    console.log("RPC Response", rpcResponse)

    if (!rpcResponse.ok) throw new Error(`Error on Elastos RPC Call - ${rpcResponse.status} : ${rpcResponse.statusText}`)

    let responseJson = await rpcResponse.json()
    
    console.log("RPC JSON", responseJson)

    if (!responseJson ||
        !responseJson["result"] ||
        !responseJson["result"]["transaction"]) return undefined

    let lastTransaction = responseJson["result"]["transaction"][0]
    console.log("Last Transaction", lastTransaction)
    let payload = atob(lastTransaction["operation"]["payload"])
    console.log("Payload", lastTransaction)
    return JSON.parse(payload)
}

const searchDIDDocumentOnCache = (did) =>{
    console.log("Enter on searchDIDDocumentOnCache", did)
    let storage = window.localStorage //?? localStorage
    let cache = storage.getItem("elastos_cache")
    console.log("Cache", cache)
    if (!cache) return undefined
    let jsonCache = JSON.parse(cache)
    let cacheItem = jsonCache[did]
    console.log("Cache Item", cacheItem)
    if (!cacheItem) return undefined

    let timestamp = core.getTimestamp()

    console.log("Expiration ", timestamp, cacheItem["expiration"])

    if (timestamp > cacheItem["expiration"]) return undefined

    return cacheItem["document"]
}





module.exports.didDocuments = {
    newDIDDocument,
    createVerifiableCredential,
    createVerifiableCredentialVP,
    createVerifiablePresentation,
    addVerfiableCredentialToDIDDocument,
    addVerfiablePresentationToDIDDocument,
    sealDocument,
    isValid,
    getMostRecentDIDDocument
}
