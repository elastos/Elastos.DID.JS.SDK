export function checkArgument(condition: boolean, errorMessage: string) {
    if (!condition)
        throw new Error(errorMessage);
}

export function checkEmpty(value: string, errorMessage: string) {
	checkArgument(value != null && value !== "", errorMessage);
}

export function checkNotNull(value: any, errorMessage: string) {
    if (value === null) {
        throw new Error(errorMessage);
    }
}

export function isEmpty(value: string) {
	return !value || value == null;
}

export function uint8ArrayCopy(src: Uint8Array, srcIndex: number, dest: Uint8Array, destIndex: number, length: number): void {
    let values = [...src.slice(srcIndex, srcIndex + length)];
    dest.set(values, destIndex);
}