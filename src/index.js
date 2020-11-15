'use strict';
const { did } = require('./did');
const { didDocuments } = require('./diddocument');
const { idChainRequest } = require('./idchainequest')

module.exports.ElastosClient = {
    did,
    didDocuments,
    idChainRequest,
};