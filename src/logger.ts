export class Logger {
    constructor(private context: string) {}

    log(...args: any) {
        console.log.apply(console, args);
    }

	info(...args: any) {
        console.log.apply(console, args);
    }

    warn(...args: any) {
        console.warn.apply(console, args);
    }

    error(...args: any) {
        console.error.apply(console, args);
    }
}