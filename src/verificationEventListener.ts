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

export class VerificationEventListener {
    public done(context : Object, succeeded : boolean, message : string) : void {}

    public reset() : void {}

    private eprintf(format : string, args : Object[]) : string {
        let content = String(format);
        for (let i = 0; i < args.length; i++) {
            content = content.replace(/\{\}/, String(args[i]));
        }
        return content;
    }

    public succeeded(context : Object, format : string, ...args: Object[]) : void {
        let message = this.eprintf(format, args);
        this.done(context, true, message);
    }

    public failed(context : Object, format : string, ...args: Object[]) : void {
        let message = this.eprintf(format, args);
        this.done(context, false, message);
    }

    public static getDefault(ident : string, succeededPrefix : string, failedPrefix : string) : VerificationEventListener {
        return new DefaultVerificationEventListener(ident, succeededPrefix, failedPrefix);
    }

    public static getDefaultWithIdent(ident : string) : VerificationEventListener {
        return new DefaultVerificationEventListener(ident, null, null);
    }
}

class Record {
    context : Object;
    succeeded : boolean;
    message : string;

    constructor(context : Object, succeeded : boolean, message : string) {
        this.context = context;
        this.succeeded = succeeded;
        this.message = message;
    }
}

class DefaultVerificationEventListener extends VerificationEventListener {
    private static EMPTY = "";

    private ident : string;
    private succeededPrefix : string;
    private failedPrefix : string;
    private records : Record[];

    constructor(ident : string, succeededPrefix : string, failedPrefix : string) {
        super();
        this.ident = ident == null ? DefaultVerificationEventListener.EMPTY : ident;
        this.succeededPrefix = succeededPrefix == null ? DefaultVerificationEventListener.EMPTY : succeededPrefix;
        this.failedPrefix = failedPrefix == null ? DefaultVerificationEventListener.EMPTY : failedPrefix;

        this.records = [];
    }

    public done(context : Object, succeeded : boolean, message : string) : void {
        this.records.unshift(new Record(context, succeeded, message));
    }

    public reset() : void {
        this.records = [];
    }

    public toString() : string {
        let str = "";
        for (let record of this.records)
            str = str.concat(this.ident, record.succeeded ? this.succeededPrefix : this.failedPrefix, record.message, "\n");

        return str;
    }
}
