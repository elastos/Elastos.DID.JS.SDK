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

import { JsonClassType, JsonCreator, JsonProperty } from "jackson-js";
import type { DID } from "../internals";
import { DIDRequest } from "./didrequest";
import { IDTransaction } from "./idtransaction";

/**
 * The class records the information of the specified DID's transaction.
 */
export class DIDTransaction extends IDTransaction<DIDTransaction, DIDRequest> {
	@JsonProperty({value: IDTransaction.OPERATION})
	@JsonClassType({type: () => [DIDRequest]})
	declare protected request: DIDRequest;

	@JsonCreator()
	static toDIDTransaction(): DIDTransaction {
		return new DIDTransaction();
	}

	/**
	 * Constructs the DIDTransaction with the given value.
	 *
	 * @param txid the transaction id string
	 * @param timestamp the time stamp
	 * @param request the IDChainRequest content
	 */
	public constructor(txid: string = null, timestamp: Date = null, request: DIDRequest = null) {
		super(txid, timestamp, request);
	}

	public getDid(): DID {
		return this.getRequest().getDid();
	}
}
