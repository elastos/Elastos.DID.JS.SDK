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

export abstract class VerificationEventListener {
	public abstract done(context : Object, succeeded : boolean, message : string) : void;

	public reset() : void {};

	private eventprintf(format : string, args : Object[]) : string {
        let content = String(format);
        for (let i = 1; i < args.length; i++) {
            content = content.replace(/\{\}/, args[i].toString);
        }
		return content;
	}

	public succeeded(context : Object, format : string, ...args: Object[]) : void {
		let message = this.eventprintf(format, args);
		this.done(context, true, message);
	}

	public failed(context : Object, format : string, ...args: Object[]) : void {
		let message = this.eventprintf(format, args);
		this.done(context, false, message);
	}

	public getDefault(ident : string, succeededPrefix : string, failedPrefix : string) : VerificationEventListener {
		return new VerificationEventListener.DefaultVerificationEventListener(ident, succeededPrefix, failedPrefix);
	}

	public getDefaultWithIdent(ident : string) : VerificationEventListener {
		return new VerificationEventListener.DefaultVerificationEventListener(ident, null, null);
	}
}

export namespace VerificationEventListener {
	export class DefaultVerificationEventListener extends VerificationEventListener {
		private static EMPTY = "";

		private ident : string;
		private succeededPrefix : string;
		private failedPrefix : string;
		private records : DefaultVerificationEventListener.Record[];

	    constructor(ident : string, succeededPrefix : string, failedPrefix : string) {
			super();
			this.ident = ident == null ? DefaultVerificationEventListener.EMPTY : ident;
			this.succeededPrefix = succeededPrefix == null ? DefaultVerificationEventListener.EMPTY : succeededPrefix;
			this.failedPrefix = failedPrefix == null ? DefaultVerificationEventListener.EMPTY : failedPrefix;

			this.records = new Array();
		}

		public done(context : Object, succeeded : boolean, message : string) : void {
			this.records.push(new VerificationEventListener.DefaultVerificationEventListener.Record(context, succeeded, message));
		}

		public reset() : void {
			this.records = [];
		}

		public toString() : string {
			let strb : string[];
			for (let record of this.records) {
				strb.push(this.ident);
				strb.push(record.succeeded ? this.succeededPrefix : this.failedPrefix)
				strb.push(record.message)
				strb.push("\n");
			}

			return strb.toString();
		}	
	}

	export namespace DefaultVerificationEventListener {
		export class Record {
			context : Object;
			succeeded : boolean;
			message : string;

			constructor(context : Object, succeeded : boolean, message : string) {
				this.context = context;
				this.succeeded = succeeded;
				this.message = message;
			}
		}		
	}
}
