export class ParentException extends Error{
	private causedBy?: Error;

    constructor(message?: string, causedBy?: Error) {
        super(message + (causedBy ? "\nCaused by: " + causedBy.message : ""));
        this.causedBy = causedBy;
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public from(e:any) {
        this.message += (" Caused by " + e.message);

        return this;
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
export class DIDStoreCryptoException extends ParentException {}
export class MalformedDocumentException extends ParentException {}
export class NotCustomizedDIDException extends ParentException {}
export class NotAttachedWithStoreException extends ParentException {}
export class NotPrimitiveDIDException extends ParentException {}
export class NoEffectiveControllerException extends ParentException {}
export class NotControllerException extends ParentException {}
export class AlreadySignedException extends ParentException {}
export class MalformedTransferTicketException extends ParentException {}
export class MalformedCredentialException extends ParentException {}
export class MalformedIDChainRequestException extends ParentException {}
export class InvalidKeyException extends ParentException {}
export class MalformedIDChainTransactionException extends ParentException {}
export class MalformedResolveResultException extends ParentException {}
export class DIDSyntaxException extends ParentException {}
export class MalformedResolveResponseException extends ParentException {}
export class DIDNotFoundException extends ParentException {}
export class MalformedDIDURLException extends ParentException {}
export class AlreadySealedException extends ParentException {}
export class CredentialNotGenuineException extends ParentException {}
export class CredentialExpiredException extends ParentException {}
export class CredentialRevokedException extends ParentException {}
export class CredentialAlreadyExistException extends ParentException {}
export class DIDNotGenuineException extends ParentException {}
export class DIDExpiredException extends ParentException {}
export class DIDNotUpToDateException extends ParentException {}
export class DIDObjectAlreadyExistException extends ParentException {}
export class IllegalUsage extends ParentException {}
export class DIDObjectNotExistException extends ParentException {}
export class CanNotRemoveEffectiveController extends ParentException {}
export class DIDObjectHasReference extends ParentException {}
export class MalformedPresentationException extends ParentException {}
export class UnsupportedOperationException extends ParentException {}
export class NetworkException extends ParentException {}
export class ResolveException extends ParentException {}
export class DIDStorageException extends ParentException {}
export class InvalidDateFormat extends ParentException {}
export class OutOfBoundException extends ParentException {}
