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

import { Logger, LoggerLevel } from "./internals";

export enum LogLevel {
    ERROR = 0,
    WARNING = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4
}

export class Features {
    private static enabledJsonLdContext = false;

    public static enableJsonLdContext(enabled: boolean): void {
        this.enabledJsonLdContext = enabled;
    }

    public static isEnabledJsonLdContext(): boolean {
        return this.enabledJsonLdContext;
    }

    public static setLogLevel(level : LogLevel) : void {
        Logger.setLevel(new LoggerLevel(level));
    }

    public static getLogLevel() : LogLevel {
        return Logger.getLevel().getLevel();
    }
}