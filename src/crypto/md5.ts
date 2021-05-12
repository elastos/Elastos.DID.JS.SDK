import crypto from "crypto";
import { Buffer } from "../buffer";

export function md5(data: Buffer): string {
    return crypto
		.createHash('md5')
		.update(data)
		.digest("hex");
}