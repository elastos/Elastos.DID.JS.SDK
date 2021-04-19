import jsrsasign from "jsrsasign"
export class BASE64 {
    public static fromString(value: string, useURLFormat: boolean = false): string{
        if (useURLFormat) return jsrsasign.stob64u(value);
        return jsrsasign.stob64(value);
    }
    public static fromHex(hexString: string, useURLFormat: boolean = false): string{
        if (useURLFormat) return jsrsasign.hextob64u(hexString);
        return jsrsasign.hextob64(hexString);
    }
    public static fromUrlFormat(b64uString: string): string{
        return jsrsasign.b64utob64(b64uString);
    }
    public static toUrlFormat(b64String: string): string{
        return jsrsasign.b64tob64u(b64String);
    }
    private static getB64(value: string) : string{
         if (value.endsWith("=")) return jsrsasign.b64utob64(value)
         return value;
    }
    public static toHex(base64String: string): string{
        return jsrsasign.b64tohex(this.getB64(base64String))
    }
    public static toString(base64String: string): string{
        return jsrsasign.b64toutf8(this.getB64(base64String))
    }

}