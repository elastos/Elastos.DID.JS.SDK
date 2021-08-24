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

// TODO: MAY BE DELETED
export enum ChangeChain {
    EXTERNAL = 0,
    INTERNAL = 1
}

// TODO: MAY BE DELETED
export enum CoinType {
    ELA = 0,
    IDCHAIN = 1
}

// TODO: MAY BE DELETED
export enum SignType {
    ELA_STANDARD = 'ELA_STANDARD',
    ELA_MULTISIG = 'ELA_MULTISIG',
    ELA_CROSSCHAIN = 'ELA_CROSSCHAIN',
    ELA_IDCHAIN = 'ELA_IDCHAIN',
    ELA_DESTROY = 'ELA_DESTROY'
}

// TODO: MAY BE DELETED
export class SignTypeMap  {
    public static readonly ELA_STANDARD = { type: 0xac, address: 0x21 };
    public static readonly ELA_MULTISIG = { type: 0xae, address: 0x12 };
    public static readonly ELA_CROSSCHAIN = { type: 0xaf, address: 0x48 };
    public static readonly ELA_IDCHAIN = { type: 0xad, address: 0x67 };
    public static readonly ELA_DESTROY = { type: 0xaa,  address: 0x0 };
}

/**
 * The class to provide the main constant.
 */
 export class Constants {
    /**
     * The deprecated default PublicKey type
     */
    public static _DEFAULT_PUBLICKEY_TYPE = "secp256r1";

    /**
     * The default PublicKey type
     */
    public static DEFAULT_PUBLICKEY_TYPE = "ECDSAsecp256r1";

    /**
     * The date format
     */
    public static DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss'Z'";

    /**
     * The iso8601 date format
     */
    public static DATE_FORMAT_ISO_8601 = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

    /**
     * The max valid year
     */
    public static MAX_VALID_YEARS = 5;

    /**
     * The UTC timezone
     */
    // TODO public static UTC: TimeZone = TimeZone.getTimeZone("UTC");
}

