/*
 * All classes extensions for the project are listed here.
 */
declare global {
    interface String {
        hashCode(): number;
        isEmpty(): boolean;
        equals(otherString: string): boolean;
        /**
         * Decodes current Base64 string into a non-Base64 string.
         */
        base64Decode(): string;
        /**
         * Encodes current non-Base64 string into a Base64 string.
         */
        base64Encode(): string;
    }

    interface Boolean {
        hashCode(): number;
    }

    interface Number {
        hashCode(): number;
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

String.prototype.equals = function(otherString: string) {
    return this === otherString;
}

String.prototype.base64Decode = function() {
    return CryptoJS.enc.Base64.parse(this).toString();
}

String.prototype.base64Encode = function() {
    // TODO: check this, I have the feeling this will not work. Why parse as "utf8"? we don't know what the string is
    // ... Maybe need to find something better than CryptoJS for this
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(this));
}

Boolean.prototype.hashCode = function() {
	return this === true ? 1231 : 1237;
}

// Consider the hash code of a number to be itself.
Number.prototype.hashCode = function() {
	return this;
}

export {}