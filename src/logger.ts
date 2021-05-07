export class Logger {

    private context: string;

    constructor(context: string) {
        this.context = context ? context : "";
    }

    log(...data: any) {
        console.log(this.format("info", data));
    }

	info(...data: any) {
        console.log(this.format("info", data));
    }

    debug(...data: any) {
        console.log(this.format("debug", data));
    }

    trace(...data: any) {
        console.log(this.format("trace", data));
    }

    warn(...data: any) {
        console.log(this.format("warn", data));
    }

    error(...data: any) {
        console.log(this.format("error", data));
    }

    private format(level: string, data: any[]): string {
        let logLine = (new Date()).toISOString() + " " + level.toUpperCase() + " " + this.context + " ";
        if (!data || data.length < 1)
            return logLine;
        let content:string = data[0].toString();
        for (let i = 1; i < data.length; i++) {
            content = content.replace(/\{\}/, data[i] ? data[i] as string: "null");
        }
        return logLine + " " + content;
    }
}