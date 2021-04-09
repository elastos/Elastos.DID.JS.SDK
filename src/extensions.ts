/*
 * All classes extensions for the project are listed here.
 */
declare global {
    interface String {
        hashCode(): number;
        isEmpty(): boolean;
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

Boolean.prototype.hashCode = function() {
	return this === true ? 1231 : 1237;
}

// Consider the hash code of a number to be itself.
Number.prototype.hashCode = function() {
	return this;
}

export {}