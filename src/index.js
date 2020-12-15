'use strict';
const { did } = require('./did');
const { didDocuments } = require('./diddocument');
const { idChainRequest } = require('./idchainequest')

const { hive } = require('./hive');

module.exports.ElastosClient = {
    did,
    didDocuments,
    idChainRequest,
    hive
};