/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Convert String (UTF-16) to UTF-8 ArrayBuffer
 *
 * @param {String} str UTF-16 string to convert
 * @return {Uint8Array} Byte sequence encoded by UTF-8
 */

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import { OutOfBoundException } from "../exceptions/exceptions";


export class ByteBuffer {
    private buffer: Uint8Array;
    private position: number;

    public constructor(byteArray: Uint8Array) {
        this.buffer = byteArray;
        this.position = 0;
    }

    public static wrap(buffer: Buffer): ByteBuffer {
        let bytes = new Uint8Array(buffer);
        for (let i = 0; i < buffer.length; ++i) {
            bytes[i] = buffer[i];

        }
        return new ByteBuffer(bytes);
    }

    public static allocate(size: number): ByteBuffer {
        return new ByteBuffer(new Uint8Array(size));
    }

    public hasRemaining(): boolean {
        return this.size() > this.position;
    }

    public size() {
        return this.buffer.length;
    }

    public reallocate() {
        const new_array = new Uint8Array(this.size() * 2);
        new_array.set(this.buffer);
        this.buffer = new_array;
    }

    public shrink() {
        this.buffer = this.buffer.subarray(0, this.position);
        return this.buffer;
    }

    public put(b: number) {
        if (this.buffer.length < this.position + 1) {
            this.reallocate();
        }
        this.buffer[this.position++] = b;
    }

    public get(index: number) {
        if (index == null) {
            index = this.position;
            this.position += 1;
        }
        if (this.buffer.length < index + 1) {
            return 0;
        }
        return this.buffer[index];
    }

    // Write short to buffer by little endian
    public putShort(num: number) {
        if (0xFFFF < num) {
            throw num + " is over short value";
        }
        const lower = (0x00FF & num);
        const upper = (0xFF00 & num) >> 8;
        this.put(lower);
        this.put(upper);
    }

    // Read short from buffer by little endian
    public getShort(index: number) {
        if (index == null) {
            index = this.position;
            this.position += 2;
        }
        if (this.buffer.length < index + 2) {
            return 0;
        }
        const lower = this.buffer[index];
        const upper = this.buffer[index + 1];
        return (upper << 8) + lower;
    }

    // Write integer to buffer by little endian
    public putInt(num: number) {
        if (0xFFFFFFFF < num) {
            throw num + " is over integer value";
        }
        const b0 = (0x000000FF & num);
        const b1 = (0x0000FF00 & num) >> 8;
        const b2 = (0x00FF0000 & num) >> 16;
        const b3 = (0xFF000000 & num) >> 24;
        this.put(b0);
        this.put(b1);
        this.put(b2);
        this.put(b3);
    }

    // Read integer from buffer by little endian
    public getInt(index: number) {
        if (index > (this.size() + 4)) {
            throw new OutOfBoundException();
        }
        if (index == null) {
            index = this.position;
            this.position += 4;
        }
        if (this.buffer.length < index + 4) {
            return 0;
        }
        const b0 = this.buffer[index];
        const b1 = this.buffer[index + 1];
        const b2 = this.buffer[index + 2];
        const b3 = this.buffer[index + 3];
        return (b3 << 24) + (b2 << 16) + (b1 << 8) + b0;
    }

    public readInt() {
        if (!this.hasRemaining()) throw new OutOfBoundException("Buffer exhausted");
        const pos = this.position;
        this.position += 4;
        return this.getInt(pos);
    }

    public putString(str: string) {
        const bytes = this.stringToUtf8Bytes(str);
        for (let i = 0; i < bytes.length; i++) {
            this.put(bytes[i]);
        }
        // put null character as terminal character
        this.put(0);
    }

    public getString(index: number) {
        let buf = [],
            ch;
        if (index == null) {
            index = this.position;
        }
        /* eslint-disable-next-line no-constant-condition */
        while (true) {
            if (this.buffer.length < index + 1) {
                break;
            }
            ch = this.get(index++);
            if (ch === 0) {
                break;
            } else {
                buf.push(ch);
            }
        }
        this.position = index;
        return this.utf8BytesToString(buf);
    }

    /**
     * Convert String (UTF-16) to UTF-8 ArrayBuffer
     *
     * @param {String} str UTF-16 string to convert
     * @return {Uint8Array} Byte sequence encoded by UTF-8
     */
    private stringToUtf8Bytes(str: string): Uint8Array {
        // Max size of 1 character is 4 bytes
        const bytes = new Uint8Array(str.length * 4);
        let i = 0, j = 0;
        while (i < str.length) {
            let unicode_code;
            const utf16_code = str.charCodeAt(i++);
            if (utf16_code >= 0xD800 && utf16_code <= 0xDBFF) {
                // surrogate pair
                const upper = utf16_code;           // high surrogate
                const lower = str.charCodeAt(i++);  // low surrogate
                if (lower >= 0xDC00 && lower <= 0xDFFF) {
                    unicode_code =
                        (upper - 0xD800) * (1 << 10) + (1 << 16) +
                        (lower - 0xDC00);
                } else {
                    // malformed surrogate pair
                    return null;
                }
            } else {
                // not surrogate code
                unicode_code = utf16_code;
            }
            if (unicode_code < 0x80) {
                // 1-byte
                bytes[j++] = unicode_code;
            } else if (unicode_code < (1 << 11)) {
                // 2-byte
                bytes[j++] = (unicode_code >>> 6) | 0xC0;
                bytes[j++] = (unicode_code & 0x3F) | 0x80;
            } else if (unicode_code < (1 << 16)) {
                // 3-byte
                bytes[j++] = (unicode_code >>> 12) | 0xE0;
                bytes[j++] = ((unicode_code >> 6) & 0x3f) | 0x80;
                bytes[j++] = (unicode_code & 0x3F) | 0x80;
            } else if (unicode_code < (1 << 21)) {
                // 4-byte
                bytes[j++] = (unicode_code >>> 18) | 0xF0;
                bytes[j++] = ((unicode_code >> 12) & 0x3F) | 0x80;
                bytes[j++] = ((unicode_code >> 6) & 0x3F) | 0x80;
                bytes[j++] = (unicode_code & 0x3F) | 0x80;
            } else {
                // malformed UCS4 code
            }
        }
        return bytes.subarray(0, j);
    }

    /**
     * Convert UTF-8 ArrayBuffer to String (UTF-16)
     *
     * @param {Array} bytes UTF-8 byte sequence to convert
     * @return {String} String encoded by UTF-16
     */
    private utf8BytesToString(bytes: Uint8Array[]): string {
        let str = "";
        let code, b1, b2, b3, b4, upper, lower;
        let i = 0;
        while (i < bytes.length) {
            b1 = bytes[i++];
            if (b1 < 0x80) {
                // 1 byte
                code = b1;
            } else if ((b1 >> 5) === 0x06) {
                // 2 bytes
                b2 = bytes[i++];
                code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
            } else if ((b1 >> 4) === 0x0e) {
                // 3 bytes
                b2 = bytes[i++];
                b3 = bytes[i++];
                code = ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
            } else {
                // 4 bytes
                b2 = bytes[i++];
                b3 = bytes[i++];
                b4 = bytes[i++];
                code = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
            }
            if (code < 0x10000) {
                str += String.fromCharCode(code);
            } else {
                // surrogate pair
                code -= 0x10000;
                upper = (0xD800 | (code >> 10));
                lower = (0xDC00 | (code & 0x3FF));
                str += String.fromCharCode(upper, lower);
            }
        }
        return str;
    }
}