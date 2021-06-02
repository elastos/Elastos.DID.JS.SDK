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