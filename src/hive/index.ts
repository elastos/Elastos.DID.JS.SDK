const { core } = require('../core');



const getPublicKey = (pubKeyHex) => {
    return core.getPublicKey(pubKeyHex);
}


module.exports.hive = {
    getPublicKey
};