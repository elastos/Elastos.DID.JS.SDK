const coinTypes = {
    ELA: 0,
    IDCHAIN: 1
}

const elastosRPCAddress = {
    mainchain: "http://api.elastos.io:20606"
}

const changeChain = {
    EXTERNAL: 0,
    INTERNAL: 1
}

const signTypes = {
    ELA_STANDARD:   'ELA_STANDARD',
    ELA_MULTISIG:   'ELA_MULTISIG',
    ELA_CROSSCHAIN: 'ELA_CROSSCHAIN',
    ELA_IDCHAIN:    'ELA_IDCHAIN',
    ELA_DESTROY:    'ELA_DESTROY'
}


const signTypeMap = {
    ELA_STANDARD:   { type: 0xac, address: 0x21 },
    ELA_MULTISIG:   { type: 0xae, address: 0x12 },
    ELA_CROSSCHAIN: { type: 0xaf, address: 0x48 },
    ELA_IDCHAIN:    { type: 0xad, address: 0x67 },
    ELA_DESTROY:    { type: 0xaa,  address: 0x0 }
}



module.exports.constants = {
    coinTypes,
    changeChain,
    signTypes,
    signTypeMap,
    elastosRPCAddress
}