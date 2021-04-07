/*
 * All classes extensions for the project are listed here.
 */
interface String {
    hashCode(): number;
}

String.prototype.hashCode = () => {
	var h = 0, i = this.length;
    while (i > 0) {
        h = (h << 5) - h + this.charCodeAt(--i) | 0;
    }
    return h;
}
