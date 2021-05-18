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

import { Logger, DefaultDIDAdapter } from "../../dist/did";

const log = new Logger("Web3Adapter");

export class Web3Adapter extends DefaultDIDAdapter {
	private static MAX_WAIT_BLOCKS = 5;
	//private static final BigInteger WAIT_FOR_CONFIRMS = BigInteger.valueOf(3);

	private contractAddress: String;

	/* private web3j: Web3j;
	private account: Credentials;
	private lastTxHash: string; */

	public constructor(rpcEndpoint: string, contractAddress: string, walletFile: string, walletPassword: string) {
		super(rpcEndpoint);
		this.initWeb3j(rpcEndpoint, walletFile, walletPassword);
		this.contractAddress = contractAddress;
	}

	private initWeb3j(rpcEndpoint: string, walletFile: string, walletPassword: string) {
		/* this.web3j = Web3j.build(new HttpService(rpcEndpoint));
		try {
			account = WalletUtils.loadCredentials(walletPassword, walletFile);
            BigDecimal balance = BigDecimal.ZERO;
			try {
				EthGetBalance ethGetBalance = web3j.ethGetBalance(account.getAddress(),
						 DefaultBlockParameterName.LATEST).sendAsync().get();
				BigInteger wei = ethGetBalance.getBalance();
				balance = Convert.fromWei(new BigDecimal(wei), Convert.Unit.ETHER);
			} catch (InterruptedException | ExecutionException e) {
				log.info("Get wallet balance error", e);
			}

			console.log("================================================");
			console.log("Wallet address: %s\n", account.getAddress());
			console.log("Wallet balance: %s\n", balance.toString());
			console.log("================================================");
		} catch (e) { // IOException | CipherException
			throw new RuntimeException("Can not load wallet: " + e.getMessage(), e);
		} */
	}

    /**
     * TODO: HERE IS THE SAMPLE CODE PROVIDED BY JINGYU EQUIVALENT TO THE JAVA CODE BELOW:
     *
     * Web3 = require("web3");
        web3 = new Web3("http://52.80.107.251:1111");
        contract = new web3.eth.Contract([
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
        ]);
        contract.options.address = "0xEA2256bd30cfeC643203d1a6f36A90A4fD17863E";
        acc = web3.eth.accounts.decrypt({"address":"53781e106a2e3378083bdcede1874e5c2a7225f8","crypto":{"cipher":"aes-128-ctr","ciphertext":"bc53c1fcd6e31a6392ddc1777157ae961e636c202ed60fb5dda77244c5c4b6ff","cipherparams":{"iv":"c5d1a7d86d0685aa4542d58c27ae7eb4"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"409429444dabb5664ba1314c93f0e1d7a1e994a307e7b43d3f6cc95850fbfa9f"},"mac":"4c37821c90d35118182c2d4a51356186482662bb945f0fcd33d3836749fe59c0"},"id":"39e7770e-4bc6-42f3-aa6a-c0ae7756b607","version":3}, "123");
        payload = '{"header":{"specification":"elastos/did/1.0","operation":"create"},"payload":"..."}}'
        cdata = contract.methods.publishDidTransaction(payload).encodeABI();
        tx = {data: cdata, to: contract.options.address, from: acc.address, gas: 3000000, gasPrice: "1000000000000"};
        acc.signTransaction(tx).then((res)=>{
            console.log("coming");
            stx = res;
            console.log(stx.rawTransaction);
            web3.eth.sendSignedTransaction(stx.rawTransaction).then(console.log)
        });
     */
	/* public void createIdTransaction(String payload, String memo)
			throws DIDTransactionException {
		@SuppressWarnings("rawtypes")
		Function contract = new Function("operationDID",
				Arrays.<Type>asList(new Utf8String(payload)),
				Collections.<TypeReference<?>>emptyList());

		String encodedContract = FunctionEncoder.encode(contract);

		try {
			//BigInteger gasPrice = web3j.ethGasPrice().sendAsync().get().getGasPrice();
			BigInteger gasPrice = new BigInteger("1000000000000");
			BigInteger gasLimit = new BigInteger("3000000");

			TransactionManager txManager = new RawTransactionManager(web3j, account);
			EthSendTransaction ethSendTx = txManager.sendTransaction(
					gasPrice,
					gasLimit,
				    contractAddress,
				    encodedContract,
				    BigInteger.ZERO);

            if (ethSendTx.hasError())
				throw new DIDTransactionException("Error send transaction: " +
						txResponse.getError().getMessage());

			String txHash = ethSendTx.getTransactionHash();

			int waitBlocks = MAX_WAIT_BLOCKS;
			while (true) {
				EthGetTransactionReceipt receipt = web3j.ethGetTransactionReceipt(txHash).sendAsync().get();
				if (receipt.hasError())
					throw new DIDTransactionException("Error transaction response: " +
							receipt.getError().getMessage());

				if (!receipt.getTransactionReceipt().isPresent()) {
					if (waitBlocks-- == 0)
						throw new DIDTransactionException("Create transaction timeout.");

					Thread.sleep(5000);
				} else {
					break;
				}
			}

			lastTxHash = txHash;
		} catch(ExecutionException | InterruptedException | IOException e) {
			throw new DIDTransactionException("Error create transaction: " + e.getMessage(), e);
		}
	}

	public boolean isAvailable() {
		if (lastTxHash == null)
			return true;

		try {
			EthTransaction tx = web3j.ethGetTransactionByHash(lastTxHash).sendAsync().get();
			if (!tx.getTransaction().isPresent())
				return true;

			BigInteger lastBlock = web3j.ethBlockNumber().sendAsync().get().getBlockNumber();
			BigInteger txBlock = tx.getResult().getBlockNumber();
			BigInteger confirms = lastBlock.subtract(txBlock);
			return confirms.compareTo(WAIT_FOR_CONFIRMS) >= 0;
		} catch (InterruptedException | ExecutionException e) {
			throw new RuntimeException("Error get confirmations: " + e.getMessage(), e);
		}
	} */
}