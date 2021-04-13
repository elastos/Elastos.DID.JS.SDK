import { DIDDocument } from "./diddocument"
import { Signer, DIDUtil } from "./DEPRECATED_core"
import { IDChainRequest } from "./backend/idchaindrequest";
import { JSONObject } from "./DEPRECATED_domain";

const rs = require('jsrsasign')
/*
export class RequestHeader extends JSONObject {
    public readonly specification: string;
    public readonly operation: string;
    public readonly previousTxid: string;

    public constructor (specification: string, operation: string, previousTxid?: string) {
        super();
        this.specification = specification;
        this.operation = operation;
        this.previousTxid = previousTxid;
    }
}

export class RequestInternal extends JSONObject {
    public readonly header: RequestHeader;
    public readonly payload: string;
    public proof?: IDChainRequest.Proof;

    public constructor (header, payload) {
        super();
        this.header = header;
        this.payload = payload;
    }
}

export class IdChainRequest {

    public generateCreateRequest (diddocument: DIDDocument, didelement) {
        return this.generateRequestInternal(diddocument, didelement, "create");
    }

    public async generateRequest (diddocument, didelement, operation) {
        let previousTxId = await this.getPreviousTxId(didelement.did);
        console.log("previousTxId", previousTxId);

        return this.generateRequestInternal(diddocument, didelement, operation, previousTxId);
    }

    public isValid (request, didElement) {
        let payload = JSON.parse(atob(request["payload"]));
        let hash = this.generateHash(request);

        return Signer.verifyData(hash, request["proof"]["signature"], didElement.publicKey);
    }

    private generateRequestInternal (diddocument: DIDDocument, didelement, operation, previousTxId? ) {
        let header;
        if (operation == "update") {
            header = new RequestHeader("elastos/did/1.0", operation, previousTxId);
        } else {
            header = new RequestHeader("elastos/did/1.0", operation);
        }
        let bSts = rs.BAtos(Buffer.from(JSON.stringify(diddocument, null, ""), "utf8"));
        let payload = rs.utf8tob64u(bSts);
        let requestInternal = new RequestInternal(header, payload);

        this.sign(didelement, requestInternal, diddocument);
        return requestInternal;
    }

    private async getPreviousTxId (did) {
        let elastosRPCHost = "http://api.elastos.io:20606";
        let responseJson = await DIDUtil.rpcResolveDID(did, elastosRPCHost);

        if (!responseJson ||
            !responseJson["result"] ||
            !responseJson["result"]["transaction"]) return undefined;

        return responseJson["result"]["transaction"][0]["txid"];
    }

    private generateHash (request: RequestInternal) {
        let specification = request.header.specification;
        let operation = request.header.operation;
        let previousTx = operation == "update" ?  request.header.previousTxid : "";
        let payload = request.payload;
        let dataToSign = Buffer.from(specification + operation + previousTx + payload, "utf8").toString("hex").toUpperCase();

        return dataToSign;
    }

    private sign (didElement, request: RequestInternal, diddocument) {
        let proof = new Proof("ECDSAsecp256r1");
        let dataToSign = this.generateHash(request);
        let signature = Signer.signData(dataToSign, didElement.privateKey);

        proof.verificationMethod = `${didElement.did}#primary`;
        proof.signature = signature;

        request.proof = proof;
    }
}
 */