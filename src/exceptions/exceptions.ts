export class ParentException extends Error{
    constructor(message?: string, private subException?: Error) {
        super(message);
    }
}

export class IllegalArgumentException extends ParentException  {}

export class WrongPasswordException extends ParentException {}

export class DIDStoreException extends ParentException {}

export class DIDResolveException extends ParentException {}
