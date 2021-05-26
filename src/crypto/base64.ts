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

    public static toByteArray(base64String: string): number[]{
        return jsrsasign.b64toBA(this.getB64(base64String))
    }

    public static fromByteArray(byteArray: number[], useURLFormat: boolean = false): string{
        let hexValue = jsrsasign.BAtohex(byteArray);
        if (useURLFormat) return jsrsasign.hextob64u(hexValue);
        return jsrsasign.hextob64(hexValue);
    }

    // TODO: Should clean up the above mess conversion methods.

    // All base64 contents inside the DID objects are base64 URL safe mode.
    // Decode the base64 URL safe input into the string encoded in hex.
    public static decode(b64uString: string): string {
        return jsrsasign.b64utohex(b64uString);
    }
}