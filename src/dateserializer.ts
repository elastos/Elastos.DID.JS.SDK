import { InvalidDateFormat } from "./exceptions/exceptions";

export class DateSerializer {
    static serialize(normalized: boolean, dateObj: Date, instance: any): string {
        return dateObj ? dateObj.toISOString().split('.')[0]+"Z" : null;
    }

    static deserialize(dateStr: string, fullJsonObj: any): Date {
        if (dateStr && isNaN(Date.parse(dateStr)))
            throw new InvalidDateFormat(dateStr);
        return dateStr ? new Date(dateStr + (dateStr.slice(dateStr.length - 1) == 'Z' ? '':'Z')) : null;
    }
}