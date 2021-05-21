# Elastos DID Typescript SDK

## SDK development workflow

- From the SDK folder: `npm run dev` (this enables hot reload when SDK files change)
- Or `npm run build` without hot reload.

## Writing tests

**Note**: the tests/ folder contains its **own package.json and node_modules**, and depends on the "external library" **@elastosfoundation/did-js-sdk**.

- Open the **tests/** folder as root in a different instance of vscode, this is the only way for now to let vscode display typescript types and issues correctly.
- `npm link ..` (every time after calling `npm install` or `npm update`) from the tests/ folder. This command uses the local version of the DID SDK, that is just in the folder above tests.
- Run one or several tests using one of the options below.

## Running tests

Several independant options:

- In vscode, Menu -> Run -> **Start debugging**

Or:

- From the command line (SDK or tests/ folders):
- `npm run test:node`

Or:

- Using **jest runner**:
- Click **run** or **debug** directly from the code, above test descriptions.


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