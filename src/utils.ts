export function checkArgument(condition: boolean, errorMessage: string) {
    if (!condition)
        throw new Error(errorMessage);
}

export function checkEmpty(value: string, errorMessage: string) {
	checkArgument(value != null && value !== "", errorMessage);
}

export function isEmpty(value: string) {
	return !value || value == null;
}