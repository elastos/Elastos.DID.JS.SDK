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

/**
 * Convenient method to return a Promise that returns a type and handles exceptions with rejections.
 */
export function promisify<T>(exec: (reject?: (e)=>void)=>T): Promise<T> {
    return new Promise((resolve, reject)=>{
        try {
            let result: T = exec((e)=>{
                reject(e);
            });
            resolve(result);
        }
        catch (e) {
            reject (e);
        }
    })
}