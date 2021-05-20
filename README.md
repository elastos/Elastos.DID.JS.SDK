# Elastos DID Typescript SDK

## The DID Adapter

A DIDAdapter is required to publish transactions to the DID chain. Different environments require different adapters such as:

### From the browser

#### Easy way, for mobile or web app developers

Using the Elastos Essentials Connector that provides a DID Adapter over Wallet connect (to let
the wallet app sign transactions):

Pseudo code:

```
let didAdapter = new EssentialsConnector.DIDAdapter();
DIDBackend.initialize(didAdapter);

// In the connectivity SDK
class EssentialsConnector.DIDAdapter {
    createdIdTransaction(payload) {
        let web3provider = new WalletConnectWeb3Provider();
        ler web3 = new Web3(web3provider);
        web3.methods.publishDID(payload);
    }
}
```

#### Tests:

DID SDK tests use a custom adapter with a hardcoded wallet to automate transactions signing
and publishing:

````
class LocalDIDAdapter {
    createdIdTransaction() {
        let acc = {...privatekey-walletwithtestnetfundsinside...};
        acc.sign();
        publishUsingLocalWeb3Instance();
    }
}

let didAdapter = new DIDSDK.Tests.LocalDIDAdapter();
DIDBackend.initialize(didAdapter);
```

#### Custom way:

````
class MyDIDAdapter extends DID.DefaultDIDAdapter {
    createdIdTransaction(payload) {
        // DO custom RPC call
    }
}

let didAdapter = new MyDIDAdapter();
DIDBackend.initialize(didAdapter);
```

## How to publish to npmjs.com

### Publishing account (NPM)

- Be a member ot organization: @elastosfoundation

### Useful commands

- `npm adduser` (once)
- `npm login` (once)
- Increase version number in package.json
- `npm publish --access=public`