export class ParentException extends Error{
    constructor(message?: string, private subException?: Error) {
        super(message);
    }
}

export class IllegalArgumentException extends ParentException  {}

export class WrongPasswordException extends ParentException {}

export class DIDStoreException extends ParentException {}

export class DIDResolveException extends ParentException {}

export class MnemonicException extends ParentException {}

export class DIDDeactivatedException extends ParentException {}

export class DIDAlreadyExistException extends ParentException {}

export class RootIdentityAlreadyExistException extends ParentException {}

export class UnknownInternalException extends ParentException {}