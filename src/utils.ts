export function checkArgument(condition: boolean, errorMessage: string) {
    if (!condition)
        throw new Error(errorMessage);
}