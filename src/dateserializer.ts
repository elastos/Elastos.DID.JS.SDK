import { InvalidDateFormat } from "./exceptions/exceptions";

export class DateSerializer {
    static serialize(dateObj: Date): string {
        return dateObj ? dateObj.toISOString().split('.')[0]+"Z" : null;
    }

    static deserialize(dateStr: string): Date {
        if (dateStr && isNaN(Date.parse(dateStr)))
            throw new InvalidDateFormat(dateStr);
        return dateStr ? new Date(dateStr + (dateStr.slice(dateStr.length - 1) == 'Z' ? '':'Z')) : null;
    }
}