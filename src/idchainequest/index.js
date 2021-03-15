const { core } = require("../core");
const { constants } = require("../constants");
const rs = require("jsrsasign");

const generateRequestInternal = (
  diddocument,
  didelement,
  operation,
  previousTxId
) => {
  let tx = {};
  core.setToJSON(tx);

  let header = {};
  core.setToJSON(header);
  core.addReadOnlyPropertyToObject(header, "specification", "elastos/did/1.0");
  core.addReadOnlyPropertyToObject(header, "operation", operation);

  if (operation == "update") {
    core.addReadOnlyPropertyToObject(header, "previousTxid", previousTxId);
  }

  core.addReadOnlyPropertyToObject(tx, "header", header);

  let bSts = rs.BAtos(
    Buffer.from(JSON.stringify(diddocument, null, ""), "utf8")
  );
  let payload = rs.utf8tob64u(bSts);

  core.addReadOnlyPropertyToObject(tx, "payload", payload);

  sign(didelement, tx, diddocument);
  return tx;
};

const getPreviousTxId = async (did) => {
  let elastosRPCHost = "https://elastos-did.noderators.org";
  let responseJson = await core.rpcResolveDID(did, elastosRPCHost);

  if (
    !responseJson ||
    !responseJson["result"] ||
    !responseJson["result"]["transaction"]
  )
    return undefined;

  return responseJson["result"]["transaction"][0]["txid"];
};

const generateHash = (tx) => {
  let specification = tx["header"]["specification"];
  let operation = tx["header"]["operation"];
  let previousTx = operation == "update" ? tx["header"]["previousTxid"] : "";
  let payload = tx["payload"];

  let dataToSign = Buffer.from(
    specification + operation + previousTx + payload,
    "utf8"
  )
    .toString("hex")
    .toUpperCase();

  return dataToSign;
};

const sign = (didElement, tx, diddocument) => {
  let proof = {};
  core.setToJSON(proof);

  let dataToSign = generateHash(tx, diddocument);
  let signature = core.signData(dataToSign, didElement.privateKey);

  core.addReadOnlyPropertyToObject(proof, "type", "ECDSAsecp256r1");
  core.addReadOnlyPropertyToObject(
    proof,
    "verificationMethod",
    `${didElement.did}#primary`
  );
  core.addReadOnlyPropertyToObject(proof, "signature", signature);

  core.addReadOnlyPropertyToObject(tx, "proof", proof);
};

const generateCreateRequest = (diddocument, didelement) => {
  return generateRequestInternal(diddocument, didelement, "create");
};

const generateRequest = async (diddocument, didelement, operation) => {
  let previousTxId = await getPreviousTxId(didelement.did);
  console.log("previousTxId", previousTxId);
  return generateRequestInternal(
    diddocument,
    didelement,
    operation,
    previousTxId
  );
};

const isValid = (request, didElement) => {
  let payload = JSON.parse(atob(request["payload"]));
  let hash = generateHash(request, payload);

  return core.verifyData(
    hash,
    request["proof"]["signature"],
    didElement.publicKey
  );
};

module.exports.idChainRequest = {
  generateCreateRequest,
  generateRequest,
  isValid,
};
