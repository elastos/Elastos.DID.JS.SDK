/**
 * NOTE: Replacement type for JAVA's "int code, String message" pair, to ease multiple
 * constructors prototypes.
 */
export class ResolveError {
    constructor(public code: number, public message: string) {}
}