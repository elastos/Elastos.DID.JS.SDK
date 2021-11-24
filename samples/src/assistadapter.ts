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

import { Logger, DefaultDIDAdapter, JSONObject } from "@elastosfoundation/did-js-sdk";
import { DIDTransactionException, IllegalArgumentException, ResolveException } from "@elastosfoundation/did-js-sdk/typings/exceptions/exceptions";
import { DID, DIDEntity, DIDRequest } from "@elastosfoundation/did-js-sdk/typings/internals";
import { OutgoingHttpHeaders } from "http2";
import { request as httpRequest } from "./http";
import { request as httpsRequest } from "./https";

const log = new Logger("AssistDIDAdapter");
export class AssistDIDAdapter extends DefaultDIDAdapter {
    private static MAINNET_RPC_ENDPOINT = "https://assist-restapi.tuum.tech/v2";
    private static TESTNET_RPC_ENDPOINT = "https://assist-restapi-testnet.tuum.tech/v2";

    private static API_KEY = "IdSFtQosmCwCB9NOLltkZrFy5VqtQn8QbxBKQoHPw7zp3w0hDOyOYjgL53DO3MDH";

    private assistRpcEndpoint: string;

	public constructor(rpcEndpoint: string) {
		super(rpcEndpoint);

		switch (rpcEndpoint.toLowerCase()) {
		case "mainnet":
			this.assistRpcEndpoint = AssistDIDAdapter.MAINNET_RPC_ENDPOINT;
			break;

		case "testnet":
			this.assistRpcEndpoint = AssistDIDAdapter.TESTNET_RPC_ENDPOINT;
			break;

		default:
			break;
		}
	}

    // NOTE: synchronous HTTP calls are deprecated and wrong practice. Though, as JAVA SDK currently
    // mainly uses synchronous calls, we don't want to diverge our code from that. We then wait for the
    // "main" java implementation to rework synchronous calls and we will also migrate to Promises/Async.
    private getRequest(url: URL, header?: Object): Promise<JSONObject> {
        return new Promise((resolve, reject) => {
            // Use a different module if we call http or https
            let requestMethod = (url.protocol.indexOf("https") === 0 ? httpsRequest : httpRequest);
            let h: Object = Object.assign({}, header,
                {
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11",
                "Content-Type": "application/json",
                "Accept": "application/json"
            });
            let req = requestMethod({
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'GET',
                headers: h as OutgoingHttpHeaders
            }, (res) => {
                let wholeData = "";
                res.on('data', d => {
                    // Concatenate data that can reach us in several pieces.
                    wholeData += d;
                })
                res.on("end", () => {
                    if (wholeData !== null && wholeData.length > 0) {
                        let responseJSON = JSON.parse(wholeData);
                        resolve(responseJSON);
                    } else {
                        resolve({})
                    }
                })
            });
            req.on('error', error => {
                reject(new ResolveException("HTTP error", error));
            });
            req.end();
        });
    }

	public async createIdTransaction(payload: string, memo: string) {
		if (payload == null || payload == "")
			throw new IllegalArgumentException("Invalid payload parameter");

        let headers = new Object();
		headers["Authorization"] = AssistDIDAdapter.API_KEY;

		let request: AssistDIDAdapter.AssistDIDRequest = null;
		try {
			request = new AssistDIDAdapter.AssistDIDRequest(payload, memo);
		} catch (e) {
			 throw new IllegalArgumentException("Invalid transaction payload", e);
		}

		let response: AssistDIDAdapter.AssistDIDResponse = null;
		try {
			let createDid = new URL(this.assistRpcEndpoint + "/didtx/create");
			let is = await this.performRequest(createDid, request.toString(), headers);
			response = new AssistDIDAdapter.AssistDIDResponse(is);
		} catch (e) {
			throw new DIDTransactionException("Access the Assist API error.", e);
		}

		if (response.meta.code != 200 || response.data.confirmationId == null)
			throw new DIDTransactionException("Asssit API error: " + response.meta.code
						+ ", message: " + response.meta.message);

		try {
			let txStatus = new URL(this.assistRpcEndpoint + "/didtx/confirmation_id/" + response.data.confirmationId);

			retry:
			while (true) {
				let is = await this.getRequest(txStatus, headers);
				let statusResponse = new AssistDIDAdapter.AssistTxStatus(is);
				if (statusResponse.meta.code != 200 || statusResponse.data.status == null)
					throw new DIDTransactionException("Asssit API error: " + response.meta.code
							+ ", message: " + response.meta.message);

                log.info("DID transaction %s is %s\n",
						statusResponse.data.blockchainTxId != null ? statusResponse.data.blockchainTxId : "n/a",
						statusResponse.data.status);

				switch (statusResponse.data.status) {
				case "pending":
				case "processing":
					await sleep(3000);
					continue;

				case "quarantined":
				case "error":
					throw new DIDTransactionException("DID transaction " +
							statusResponse.data.blockchainTxId + " is " +
							statusResponse.data.status);

				case "completed":
					break retry;
				}
			}
		} catch (e) {
			throw new DIDTransactionException("Access the Assist API error.", e);
		}
	}
}

export namespace AssistDIDAdapter {
	export class AssistDIDRequest extends DIDEntity<AssistDIDRequest> {
        private did: DID; //"did"
        private memo: string; //"memo"
        private agent: string; // "requestFrom"
        private request: DIDRequest; // "didRequest"

		constructor(payload: string, memo: string) {
            super();
			this.request = DIDRequest.parse(payload);
			this.did = this.request.getDid();
			this.memo = memo == null ? "" : memo;
			this.agent = "DID command line utils";
		}

        public toJSON(key: string = null): JSONObject {
            let json: JSONObject = {};
            json.did = this.did.toString();
            json.memo = this.memo;
            json.requestFrom = this.agent;
            json.didRequest = this.request.serialize(true);

            return json;
        }

        public fromJSON(json: JSONObject, context: DID = null): void {
            this.did = this.getDid("did", json.did, { mandatory: false, nullable: false, defaultValue: null });
            this.memo = this.getString("memo", json.memo, { mandatory: false, nullable: false });
            this.agent = this.getString("requestFrom", json.requestFrom, { mandatory: false, nullable: false });
            this.request = DIDRequest.parse(json.request as JSONObject);
        }
    }

	export class AssistDIDResponseMeta extends DIDEntity<AssistDIDResponseMeta> {
        public code: number;  //"code"
        public message: string;     // "message"

        constructor(json: JSONObject) {
            super();
            this.code = this.getNumber("code", json.code, { mandatory: true, nullable: false });
            this.message = this.getString("message", json.message, { mandatory: true, nullable: false });
        }

        public toJSON(key: string = null) : JSONObject {
            return {
                code: this.code,
                message: this.message
            }
        }

        public fromJSON(json: JSONObject, context: DID = null): void {}
	}

	export class AssistDIDResponseData extends DIDEntity<AssistDIDResponseMeta> {
        public confirmationId: string; // "confirmation_id"
        public serviceCount: string;   // "service_count"
        public duplicate: boolean;     // "duplicate"

        constructor(json: JSONObject) {
            super();
            this.confirmationId = this.getString("confirmation_id", json.confirmation_id, { mandatory: true, nullable: false });
            this.serviceCount = this.getString("service_count", json.service_count, { mandatory: true, nullable: false });
            this.duplicate = this.getBoolean("duplicate", json.duplicate, { mandatory: true, nullable: false });
        }

        public toJSON(key: string = null) : JSONObject {
            return {
                confirmation_id: this.confirmationId,
                service_count: this.serviceCount,
                duplicate: this.duplicate
            }
        }

        public fromJSON(json: JSONObject, context: DID = null): void {}
	}

	export class AssistDIDResponse extends DIDEntity<AssistDIDResponse> {
        public meta: AssistDIDResponseMeta; //"meta"
        public data: AssistDIDResponseData; //"data"

        constructor(json: JSONObject) {
            super();
            this.meta = new AssistDIDResponseMeta(json.meta as JSONObject);
            this.data = new AssistDIDResponseData(json.data as JSONObject);
        }

        public toJSON(key: string = null): JSONObject {
            let json: JSONObject = {};

            json.meta = this.meta.toJSON();
            json.data = this.data.toJSON();
            return json;
        }

        public fromJSON(json: JSONObject, context: DID = null): void {
            this.meta = new AssistDIDResponseMeta(json.meta as JSONObject);
            this.data = new AssistDIDResponseData(json.data as JSONObject);
        }
	}

	export class AssistTxStatusData extends DIDEntity<AssistTxStatusData>  {
        public id: string; //"id"
        public did: string; //"did"
        public agent: string; //"requestFrom"
        public status: string; //"status"
        public blockchainTxId: string; //"blockchainTxId"

        constructor(json: JSONObject) {
            super();
            this.id = this.getString("id", json.id, { mandatory: true, nullable: false });
            this.did = this.getString("did", json.did, { mandatory: true, nullable: false });
            this.agent = this.getString("requestFrom", json.agent, { mandatory: true, nullable: false });
            this.status = this.getString("status", json.status, { mandatory: true, nullable: false });
            this.blockchainTxId = this.getString("blockchainTxId", json.blockchainTxId, { mandatory: true, nullable: false });
        }

        public toJSON(key: string = null): JSONObject {
            return {
                id: this.id,
                did: this.did,
                requestFrom: this.agent,
                status: this.status,
                blockchainTxId: this.blockchainTxId
            }
        }

        public fromJSON(json: JSONObject, context: DID = null): void {}
	}

	export class AssistTxStatus extends DIDEntity<AssistTxStatus> {
        public meta: AssistDIDResponseMeta; //"meta"
        public data: AssistTxStatusData;    //"data"

        constructor(json: JSONObject) {
            super();
            this.meta = new AssistDIDResponseMeta(json.meta as JSONObject);
            this.data = new AssistTxStatusData(json.data as JSONObject);
        }

        public toJSON(key: string = null): JSONObject {
            let json: JSONObject = {};

            json.meta = this.meta.toJSON();
            json.data = this.data.toJSON();

            return json;
        }

        public fromJSON(json: JSONObject, context: DID = null): void {}
	}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

