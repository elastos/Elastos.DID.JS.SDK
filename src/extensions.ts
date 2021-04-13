import { Comparable } from "./comparable";

/*
 * All classes extensions for the project are listed here.
 */
declare global {
    interface String {
        hashCode(): number;
        /**
         * Convenient method imported from java, to convert this string to a buffer.
         */
        getBytes(): Buffer;
        isEmpty(): boolean;
        equals(otherString: string): boolean;
        compareTo(otherString: string): number;
        /**
         * Decodes current Base64 string into a non-Base64 string.
         */
        base64Decode(): string;
        /**
         * Encodes current non-Base64 string into a Base64 string.
         */
        base64Encode(): string;
        sha256();
    }

    interface Boolean {
        hashCode(): number;
    }

    interface Number {
        hashCode(): number;
    }

    interface Array<T> {
        /**
         * Checks if the array contains the given Comparable object. Both objects must implement
         * the Comparable interface in order to be compared, or an exception is thrown.
         */
        contains(obj: T): boolean;
        /**
         * Removed the given object from the array, using a deep comparison (Comparable.equals()).
         * Returns true if the object was deleted, false otherwise.
         */
        remove(obj: T): boolean;
    }
}

String.prototype.hashCode = function() {
	var h = 0, i = this.length;
    while (i > 0) {
        h = (h << 5) - h + this.charCodeAt(--i) | 0;
    }
    return h;
}

String.prototype.isEmpty = function() {
    return this === "";
}

String.prototype.getBytes = function() {
    return Buffer.from(this);
}

String.prototype.equals = function(otherString: string) {
    return this === otherString;
}

String.prototype.compareTo = function(otherString: string) {
    if (this > otherString) return 1;
    else if (this < otherString) return -1;
    else return 0;
}

String.prototype.base64Decode = function() {
    return CryptoJS.enc.Base64.parse(this).toString();
}

String.prototype.base64Encode = function() {
    // TODO: check this, I have the feeling this will not work. Why parse as "utf8"? we don't know what the string is
    // ... Maybe need to find something better than CryptoJS for this
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(this));
}

String.prototype.sha256 = function() {
    return CryptoJS.SHA256(this).toString();
}

Boolean.prototype.hashCode = function() {
	return this === true ? 1231 : 1237;
}

// Consider the hash code of a number to be itself.
Number.prototype.hashCode = function() {
	return this;
}

Array.prototype.contains = function(obj: Comparable<any>) {
    if (obj.equals === undefined)
        throw new Error("Array contains() can be called only on Comparable objects");
    return this.find(item => item.equals(obj)) !== undefined;
}

Array.prototype.remove = function(obj: Comparable<any>) {
    if (obj.equals === undefined)
        throw new Error("Array remove() can be called only on Comparable objects");
    let foundIndex = this.findIndex(item => item.equals(obj));
    if (foundIndex < 0)
        return false;

    this.splice(foundIndex, 1);
    return true;
};

export {}