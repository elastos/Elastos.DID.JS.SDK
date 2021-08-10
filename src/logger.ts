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

class LogLevel {
    public id: number;
    public name: string;

    constructor (id: number, name: string) {
        this.id = id;
        this.name = name;
    }
}
export class Logger {
    public static TRACE = new LogLevel(0, "TRACE");
    public static DEBUG = new LogLevel(1, "DEBUG");
    public static INFO = new LogLevel(2, "INFO");
    public static WARNING = new LogLevel(3, "WARN");
    public static ERROR = new LogLevel(4, "ERROR");

    private context: string;
    private static logLevel = Logger.TRACE;

    public static setLevel(level: LogLevel) {
        if (level <= Logger.TRACE && level >= Logger.INFO) {
            Logger.logLevel = level;
        }
    }

    public static getLevel(): LogLevel {
        return Logger.logLevel;
    }

    public static levelIs(level: LogLevel) {
        return level <= Logger.logLevel;
    }

    constructor(context: string) {
        this.context = context ? context : "";
    }

    log(...data: any) {
        if (Logger.logLevel.id >= Logger.INFO.id) {
            console.log(this.format(Logger.INFO, data));
        }
    }

    info(...data: any) {
        if (Logger.logLevel.id >= Logger.INFO.id) {
            console.log(this.format(Logger.INFO, data));
        }
    }

    debug(...data: any) {
        if (Logger.logLevel.id >= Logger.DEBUG.id) {
            console.log(this.format(Logger.DEBUG, data));
        }
    }

    trace(...data: any) {
        if (Logger.logLevel.id >= Logger.TRACE.id) {
            console.log(this.format(Logger.TRACE, data));
        }
    }

    warn(...data: any) {
        if (Logger.logLevel.id >= Logger.WARNING.id) {
            console.log(this.format(Logger.WARNING, data));
        }
    }

    error(...data: any) {
        if (Logger.logLevel.id >= Logger.ERROR.id) {
            console.log(this.format(Logger.ERROR, data));
        }
    }

    private format(level: LogLevel, data: any[]): string {
        let logLine = (new Date()).toISOString() + " " + level.name.toUpperCase() + " " + this.context + " ";
        if (!data || data.length < 1)
            return logLine;
        let content = String(data[0]);
        for (let i = 1; i < data.length; i++) {
            content = content.replace(/\{\}/, String(data[i]));
        }
        return logLine + " " + content;
    }
}