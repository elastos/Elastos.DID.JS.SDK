/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Logger, DefaultDIDAdapter } from "@elastosfoundation/did-js-sdk";
import Web3 from "web3";

const log = new Logger("Web3Adapter");
const PUBLISH_CONTRACT_ABI: any = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "payable": false,
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "data",
                "type": "string"
            }
        ],
        "name": "publishDidTransaction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "payable": false,
        "type": "function"
    }
];

export class Web3Adapter extends DefaultDIDAdapter {
    private static MAX_WAIT_BLOCKS = 5;
    private lastTxHash: string;
    private contractAddress: string;

    private constructor() {
        super();
    }

    public static async initialize(rpcEndpoint: string, contractAddress: string, walletFile: string, walletPassword: string): Promise<Web3Adapter> {
        let defaultAdapter = await DefaultDIDAdapter.init(new URL("/resolve", new URL(rpcEndpoint)).toString());
        const adapter = Object.create(defaultAdapter);
        adapter.contractAddress = contractAddress;
        return adapter;
    }

    public async createIdTransaction(payload: string, memo: string) {
        let web3 = new Web3(super.rpcEndpoint.toString());
        let contract = new web3.eth.Contract(PUBLISH_CONTRACT_ABI, this.contractAddress);

        // PRIVNET WALLET WITH FUNDS TO PUBLISH - TODO: MAKE THIS BE A ENV DATA, NOT PUSHED.
        let acc = web3.eth.accounts.decrypt({
            "version": 3,
            "id": "ffcd8c94-80ef-4410-b743-d2f72ecdc80e",
            "address": "2291bb3d2b5d55217262bf1552ab9b95bfe5b72d",
            "crypto": {
                "ciphertext": "38d49204366be1e7f51464c20f33e51d8138b72411cf055bbd1bd3d9e03624a2",
                "cipherparams": {
                    "iv": "a5108e26cacaf50842f9b8ebf7047bdf"
                },
                "cipher": "aes-128-ctr",
                "kdf": "scrypt",
                "kdfparams": {
                    "dklen": 32,
                    "salt": "75a558ca5f7eda86237b11c514f96e348bdb94b554b15c55e5cd1dc6c79a577d",
                    "n": 262144,
                    "r": 8,
                    "p": 1
                },
                "mac": "75e5b2371464435015f1d153bce23097774bdef78c67694a89b25434c2fa0ba2"
            }
        },
        "password");
        let cdata = contract.methods.publishDidTransaction(payload).encodeABI();
        let tx = {
            data: cdata,
            to: contract.options.address,
            from: acc.address,
            gas: 40000000,
            gasPrice: "1000000000"
        };

        let stx = await acc.signTransaction(tx);
        console.log(stx.rawTransaction); // TODO: improve
        let receipt = await web3.eth.sendSignedTransaction(stx.rawTransaction, (err, hash) => {
            console.log("sendSignedTransaction result:", err, hash);
        });

        let txHash = receipt.transactionHash;
        this.lastTxHash = txHash;
    }

    public awaitStandardPublishingDelay(): Promise<void> {
        return new Promise(resolve => {setTimeout(resolve, 10000)});
    }
}