/*
 * All classes extensions for the project are listed here.
 */
declare global {
    interface String {
        hashCode(): number;
    }

    interface Boolean {
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

Boolean.prototype.hashCode = function() {
	return this === true ? 1231 : 1237;
}

export {}