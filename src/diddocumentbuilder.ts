import { Constants } from "./constants";
import { DIDDocument } from "./diddocument";
import { DID } from "./did";
import { DIDMetadata } from "./didmetadata";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { 
    IllegalArgumentException,
    AlreadySealedException,
    DIDObjectAlreadyExistException,
    IllegalUsage,
    UnknownInternalException,
    DIDObjectNotExistException,
    AlreadySignedException,
    CanNotRemoveEffectiveController,
    DIDObjectHasReference,
    DIDNotFoundException,
    DIDDeactivatedException,
    DIDExpiredException,
    DIDNotGenuineException,
    NotPrimitiveDIDException,
    NotCustomizedDIDException,
    MalformedDocumentException,
    NotAttachedWithStoreException,
    NotControllerException,
    NoEffectiveControllerException
} from "./exceptions/exceptions";
import { checkArgument } from "./utils";
import { HDKey } from "./crypto/hdkey";
import { Logger } from "./logger";
import { VerifiableCredential } from "./verifiablecredential";
import { Issuer } from "./issuer";
import { JSONObject } from "./json";
import { Collections } from "./collections";
import dayjs from "dayjs";

/**
* Builder object to create or modify the DIDDocument.
*/
export class DIDDocumentBuilder {

    private static log = new Logger("DIDDocumentBuilder");

    private document: DIDDocument;
    private controllerDoc: DIDDocument;

    private constructor() { }

    /**
     * Constructs DID Document Builder with given customizedDid and DIDStore.
     *
     * @param did the specified DID
     * @param store the DIDStore object
     */
    public static newFromDID(did: DID, store: DIDStore, controller?: DIDDocument) {
        let builder = new DIDDocumentBuilder();
        builder.document = new DIDDocument(did);

        if (controller !== undefined) {
            builder.document.controllers = [];
            builder.document.controllerDocs = new Map();

            builder.document.controllers.push(controller.getSubject());
            builder.document.controllerDocs.set(controller.getSubject(), controller);
            builder.document.effectiveController = controller.getSubject();

            builder.document.setMetadata(new DIDMetadata(did, store));

            builder.controllerDoc = controller;
        }
        else {
            let metadata: DIDMetadata = new DIDMetadata(did, store);
            builder.document.setMetadata(metadata);
        }
        return builder;
    }

    /**
     * Constructs DID Document Builder with given DID Document.
     *
     * @param doc the DID Document object
     */
    public static newFromDocument(doc: DIDDocument, controller?: DIDDocument): DIDDocumentBuilder {
        let builder = new DIDDocumentBuilder();
        builder.document = doc.copy();
        if (controller !== undefined) {
            builder.document.effectiveController = controller.getSubject();
            builder.controllerDoc = controller;
        }
        return builder;
    }

    public edit(controller?: DIDDocument): DIDDocumentBuilder {
        if (controller !== undefined) {
            this.document.checkIsCustomized();

            if (!this.document.getMetadata().attachedStore() && !controller.getMetadata().attachedStore())
                throw new NotAttachedWithStoreException();

            if (!controller.getMetadata().attachedStore())
                controller.getMetadata().attachStore(this.document.getMetadata().getStore());

            if (!this.document.hasController(controller.getSubject()))
                throw new NotControllerException(controller.getSubject().toString());

            this.document.effectiveController = controller.getSubject();
            this.controllerDoc = controller;
            return this;
        }
        else {
            if (!this.document.isCustomizedDid()) {
                this.document.checkAttachedStore();

                return this;
            } else {
                if (this.document.getEffectiveController() == null)
                    throw new NoEffectiveControllerException();

                return this.edit(this.document.getEffectiveControllerDocument());
            }
        }
    }


    private canonicalId(id: DIDURL | string): DIDURL {
        if (typeof id === "string") {
            return DIDURL.valueOf(this.getSubject(), id);
        }
        else {
            if (id == null || id.getDid() != null)
                return id;

            return DIDURL.valueOf(this.getSubject(), id);
        }
    }

    private invalidateProof() {
        if (this.document.proofs != null && this.document.proofs.size != 0)
            this.document.proofs.clear();
    }

    private checkNotSealed() {
        if (document == null)
            throw new AlreadySealedException();
    }

    private checkIsCustomized() {
        if (!this.document.isCustomizedDid())
            throw new NotCustomizedDIDException(this.document.getSubject().toString());
    }

    /**
     * Get document subject from did document builder.
     *
     * @return the owner of did document builder
     */
    public getSubject(): DID {
        this.checkNotSealed();
        return this.document.getSubject();
    }

    /**
     * Add a new controller to the customized DID document.
     *
     * @param controller the new controller's DID
     * @return the Builder object
     * @throws DIDResolveException if failed resolve the new controller's DID
     */
    public addController(controller: DID | string): DIDDocumentBuilder {
        checkArgument(controller != null, "Invalid controller");

        if (typeof controller === "string")
            controller = DID.valueOf(controller);

        this.checkNotSealed();
        this.checkIsCustomized();
        checkArgument(!this.document.controllers.contains(controller), "Controller already exists");
        let controllerDoc = controller.resolve(true);
        if (controllerDoc == null)
            throw new DIDNotFoundException(controller.toString());

        if (controllerDoc.isDeactivated())
            throw new DIDDeactivatedException(controller.toString());

        if (controllerDoc.isExpired())
            throw new DIDExpiredException(controller.toString());

        if (!controllerDoc.isGenuine())
            throw new DIDNotGenuineException(controller.toString());

        if (controllerDoc.isCustomizedDid())
            throw new NotPrimitiveDIDException(controller.toString());

        this.document.controllers.push(controller);
        this.document.controllerDocs.set(controller, controllerDoc);

        this.document.multisig = null; // invalidate multisig
        this.invalidateProof();
        return this;
    }

    /**
     * Remove controller from the customized DID document.
     *
     * @param controller the controller's DID to be remove
     * @return the Builder object
     */
    public removeController(controller: DID | string): DIDDocumentBuilder {
        checkArgument(controller != null, "Invalid controller");

        if (typeof controller === "string")
            controller = DID.valueOf(controller);

        this.checkNotSealed();
        this.checkIsCustomized();
        // checkArgument(document.controllers.contains(controller), "Controller not exists");

        if (controller.equals(this.controllerDoc.getSubject()))
            throw new CanNotRemoveEffectiveController(controller.toString());

        if (this.document.controllers.remove(controller)) {
            this.document.controllerDocs.delete(controller);
            this.invalidateProof();
        }

        return this;
    }

    /**
     * Set multiple signature for multi-controllers DID document.
     *
     * @param m the required signature count
     * @return the Builder object
     */
    public setMultiSignature(m: number): DIDDocumentBuilder {
        this.checkNotSealed();
        this.checkIsCustomized();
        checkArgument(m >= 1, "Invalid signature count");

        let n = this.document.controllers.length;
        checkArgument(m <= n, "Signature count exceeds the upper limit");

        let multisig: DIDDocument.MultiSignature = null;
        if (n > 1)
            multisig = new DIDDocument.MultiSignature(m, n);

        if (this.document.multisig == null && multisig == null)
            return this;

        if (this.document.multisig != null && multisig != null &&
            this.document.multisig.equals(multisig))
            return this;

        this.document.multisig = new DIDDocument.MultiSignature(m, n);

        this.invalidateProof();
        return this;
    }

    private addPublicKey(key: DIDDocument.PublicKey) {
        if (this.document.publicKeys == null) {
            this.document.publicKeys = new Map<DIDURL, DIDDocument.PublicKey>();
        } else {
            // Check the existence, both id and keyBase58
            for (let pk of this.document.publicKeys.values()) {
                if (pk.getId().equals(key.getId()))
                    throw new DIDObjectAlreadyExistException("PublicKey id '"
                        + key.getId() + "' already exist.");

                if (pk.getPublicKeyBase58() === key.getPublicKeyBase58())
                    throw new DIDObjectAlreadyExistException("PublicKey '"
                        + key.getPublicKeyBase58() + "' already exist.");
            }
        }

        this.document.publicKeys.set(key.getId(), key);
        if (this.document.defaultPublicKey == null) {
            let address = HDKey.toAddress(key.getPublicKeyBytes());
            if (address === this.getSubject().getMethodSpecificId()) {
                this.document.defaultPublicKey = key;
                key.setAuthenticationKey(true);
            }
        }

        this.invalidateProof();
    }

    /**
     * Add PublicKey to did document builder.
     *
     * @param id the key id
     * @param controller the owner of public key
     * @param pk the public key base58 string
     * @return the DID Document Builder object
     */
    // Java: addPublicKey()
    public createAndAddPublicKey(id: DIDURL | string, type: string, pk: string, controller?: DID | string): DIDDocumentBuilder {
        this.checkNotSealed();

        if (typeof id === "string")
            id = DIDURL.newWithUrl(id);

        if (controller === undefined)
            controller = null as DID;
        else if (typeof controller === "string")
            controller = DID.valueOf(controller);

        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())), "Invalid publicKey id");
        checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

        if (controller == null)
            controller = this.getSubject();

        this.addPublicKey(new DIDDocument.PublicKey(this.canonicalId(id), type, controller, pk));
        return this;
    }

    /**
     * Remove PublicKey with the specified key id.
     *
     * @param id the key id
     * @param force the owner of public key
     * @return the DID Document Builder object
     */
    public removePublicKey(id: DIDURL | string, force: boolean = false): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        id = this.canonicalId(id);
        let pk = this.document.publicKeys.get(id);
        if (pk == null)
            throw new DIDObjectNotExistException(id.toString());

        // Can not remove default public key
        if (this.document.defaultPublicKey != null && this.document.defaultPublicKey.getId().equals(id))
            throw new DIDObjectHasReference(id.toString() + "is default key");

        if (!force) {
            if (pk.isAuthenticationKey() || pk.isAuthorizationKey())
                throw new DIDObjectHasReference(id.toString());
        }

        if (this.document.publicKeys.delete(id) != null) {
            try {
                // TODO: should delete the loosed private key when store the document
                if (this.document.getMetadata().attachedStore())
                    this.document.getMetadata().getStore().deletePrivateKey(id);
            } catch (ignore) {
                // DIDStoreException
                DIDDocumentBuilder.log.error("INTERNAL - Remove private key", ignore);
            }

            this.invalidateProof();
        }

        return this;
    }

    // Java: addAuthenticationKey()
    public addExistingAuthenticationKey(id: DIDURL): DIDDocumentBuilder {
        checkArgument(id != null, "Invalid publicKey id");

        if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        id = this.canonicalId(id);
        let key: DIDDocument.PublicKey = this.document.publicKeys.get(id);
        if (key == null)
            throw new DIDObjectNotExistException(id.toString());

        // Check the controller is current DID subject
        if (!key.getController().equals(this.getSubject()))
            throw new IllegalUsage(id.toString());

        if (!key.isAuthenticationKey()) {
            key.setAuthenticationKey(true);
            this.invalidateProof();
        }

        return this;
    }

    /**
     * Add the exist Public Key matched the key id to be Authentication key.
     *
     * @param id the key id
     * @return the DID Document Builder object
     */
    public addAuthenticationKey(id: DIDURL | string, pk: string): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (typeof id === "string")
            id = this.canonicalId(id);

        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
            "Invalid publicKey id");
        checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

        let key: DIDDocument.PublicKey = new DIDDocument.PublicKey(this.canonicalId(id), null, this.getSubject(), pk);
        key.setAuthenticationKey(true);
        this.addPublicKey(key);

        return this;
    }

    /**
     * Remove Authentication Key matched the given id.
     *
     * @param id the key id
     * @return the DID Document Builder
     */
    public removeAuthenticationKey(id: DIDURL): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        id = this.canonicalId(id);
        let key = this.document.publicKeys.get(id);
        if (key == null || !key.isAuthenticationKey())
            throw new DIDObjectNotExistException(id.toString());

        // Can not remove default public key
        if (this.document.defaultPublicKey != null && this.document.defaultPublicKey.getId().equals(id))
            throw new DIDObjectHasReference(
                "Cannot remove the default PublicKey from authentication.");

        if (key.isAuthenticationKey()) {
            key.setAuthenticationKey(false);
            this.invalidateProof();
        } else {
            throw new DIDObjectNotExistException(id.toString());
        }

        return this;
    }

    /**
     * Remove Authentication Key matched the given id.
     *
     * @param id the key id string
     * @return the DID Document Builder
     */
    /* public removeAuthenticationKey(id: string): DIDDocumentBuilder {
        return removeAuthenticationKey(canonicalId(id));
    } */

    /**
     * Add the exist Public Key matched the key id to be Authorization key.
     *
     * @param id the key id
     * @return the DID Document Builder
     */
    // Java: addAuthorizationKey
    public addExistingAuthorizationKey(id: DIDURL): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (this.document.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());

        if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        id = this.canonicalId(id);
        let key: DIDDocument.PublicKey = this.document.publicKeys.get(id);
        if (key == null)
            throw new DIDObjectNotExistException(id.toString());

        // Can not authorize to self
        if (key.getController().equals(this.getSubject()))
            throw new IllegalUsage(id.toString());

        if (!key.isAuthorizationKey()) {
            key.setAuthorizationKey(true);
            this.invalidateProof();
        }

        return this;
    }

    /**
     * Add the exist Public Key matched the key id to be Authorization Key.
     *
     * @param id the key id string
     * @return the DID Document Builder
     */
    /* public addAuthorizationKey(id: string): DIDDocumentBuilder {
        return addAuthorizationKey(canonicalId(id));
    } */

    /**
     * Add the PublicKey named key id to be Authorization Key.
     * It is failed if the key id exist but the public key base58 string is not same as the given pk string.
     *
     * @param id the key id
     * @param controller the owner of public key
     * @param pk the public key base58 string
     * @return the DID Document Builder
     */
    public addAuthorizationKey(id: DIDURL | string, controller: DID | string, pk: string): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (typeof id === "string")
            id = this.canonicalId(id);

        if (typeof controller === "string")
            controller = DID.valueOf(controller);

        checkArgument(id.getDid() == null || id.getDid().equals(this.getSubject()),
            "Invalid publicKey id");
        checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

        if (this.document.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());

        // Can not authorize to self
        if (controller.equals(this.getSubject()))
            throw new IllegalUsage("Key's controller is self.");

        let key: DIDDocument.PublicKey = new DIDDocument.PublicKey(this.canonicalId(id), null, controller, pk);
        key.setAuthorizationKey(true);
        this.addPublicKey(key);

        return this;
    }

    /**
     * Add the specified key to be an Authorization key.
     * This specified key is the key of specified controller.
     * Authentication is the mechanism by which the controller(s) of a DID can
     * cryptographically prove that they are associated with that DID.
     * A DID Document must include authentication key.
     *
     * @param id the key id
     * @param controller the owner of 'key'
     * @param key the key of controller to be an Authorization key.
     * @return the DID Document Builder
     * @throws DIDResolveException resolve controller failed.
     * @throws InvalidKeyException the key is not an authentication key.
     */
    public authorizationDid(id: DIDURL, controller: DID, key: DIDURL): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
            "Invalid publicKey id");
        checkArgument(controller != null && !controller.equals(this.getSubject()), "Invalid controller");

        if (this.document.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());

        let controllerDoc = controller.resolve();
        if (controllerDoc == null)
            throw new DIDNotFoundException(id.toString());

        if (controllerDoc.isDeactivated())
            throw new DIDDeactivatedException(controller.toString());

        if (controllerDoc.isExpired())
            throw new DIDExpiredException(controller.toString());

        if (!controllerDoc.isGenuine())
            throw new DIDNotGenuineException(controller.toString());

        if (controllerDoc.isCustomizedDid())
            throw new NotPrimitiveDIDException(controller.toString());

        if (key == null)
            key = controllerDoc.getDefaultPublicKeyId();

        // Check the key should be a authentication key.
        let targetPk = controllerDoc.getAuthenticationKey(key);
        if (targetPk == null)
            throw new DIDObjectNotExistException(key.toString());

        let pk = new DIDDocument.PublicKey(this.canonicalId(id), targetPk.getType(),
            controller, targetPk.getPublicKeyBase58());
        pk.setAuthorizationKey(true);
        this.addPublicKey(pk);

        return this;
    }

    /**
     * Remove the Authorization Key matched the given id.
     *
     * @param id the key id
     * @return the DID Document Builder
     */
    public removeAuthorizationKey(inputId: DIDURL | string): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(inputId != null, "Invalid publicKey id");

        let id = typeof inputId === "string" ? this.canonicalId(inputId) : inputId;

        if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        id = this.canonicalId(id);
        let key: DIDDocument.PublicKey = this.document.publicKeys.get(id);
        if (key == null)
            throw new DIDObjectNotExistException(id.toString());

        if (key.isAuthorizationKey()) {
            key.setAuthorizationKey(false);
            this.invalidateProof();
        } else {
            throw new DIDObjectNotExistException(id.toString());
        }

        return this;
    }

    /**
     * Add Credentail to DID Document Builder.
     *
     * @param vc the Verifiable Credential object
     * @return the DID Document Builder
     */
    public addCredential(vc: VerifiableCredential): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(vc != null, "Invalid credential");

        // Check the credential belongs to current DID.
        if (!vc.getSubject().getId().equals(this.getSubject()))
            throw new IllegalUsage(vc.getSubject().getId().toString());

        if (this.document.credentials == null) {
            this.document.credentials = new Map<DIDURL, VerifiableCredential>();
        } else {
            if (this.document.credentials.has(vc.getId()))
                throw new DIDObjectAlreadyExistException(vc.getId().toString());
        }

        this.document.credentials.set(vc.getId(), vc);
        this.invalidateProof();

        return this;
    }

    /**
     * Add Credential with the given values.
     *
     * @param id the Credential id
     * @param types the Credential types set
     * @param subject the Credential subject(key/value)
     * @param expirationDate the Credential expires time
     * @param storepass the password for DIDStore
     * @return the DID Document Builder
     * @throws DIDStoreException there is no DID store to attach.
     * @throws InvalidKeyException there is no authentication key.
     */
    // TODO: Use our new "Json" type instead of a map
    // Java: addCredential()
    public createAndAddCredential(id: DIDURL, types: string[] = null, subject: JSONObject = null, expirationDate: Date = null, storepass: string): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
            "Invalid publicKey id");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

        let issuer = new Issuer(this.document);
        let cb = issuer.issueFor(this.document.getSubject());
        if (types == null)
            types = ["SelfProclaimedCredential"];

        if (expirationDate == null)
            expirationDate = this.document.getExpires();

        try {
            let vc = cb.id(this.canonicalId(id))
                .type(...types)
                .properties(subject)
                .expirationDate(expirationDate)
                .seal(storepass);

            this.addCredential(vc);
        } catch (ignore) {
            // MalformedCredentialException
            throw new UnknownInternalException(ignore);
        }

        return this;
    }

    /**
     * Add Credential with the given values.
     * Credential subject supports json string.
     *
     * @param id the Credential id
     * @param types the Credential types
     * @param json the Credential subject(json string)
     * @param expirationDate the Credential expires time
     * @param storepass the password for DIDStore
     * @return the DID Document Builder
     * @throws DIDStoreException there is no DID store to attach.
     * @throws InvalidKeyException there is no authentication key.
     */
    // NOTE: compared to java, almost all addCredential overrides have been removed for clarity.
    // Callers must use DIDURL.valueOf(string) for the id, and a json object (not a map nor a Map).
    // TODO: also remove this "json subject" version + use json objec tinstead of subject map
    /* public addCredential(id: DIDURL, types: string[], json: string, expirationDate: Date, storepass: string): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(json != null && !json.isEmpty(), "Invalid json");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

        let issuer = new Issuer(this.document);
        let cb = issuer.issueFor(this.document.getSubject());
        if (types == null)
            types = ["SelfProclaimedCredential"];

        if (expirationDate == null)
            expirationDate = this.document.expires;

        try {
            let vc = cb.id(this.canonicalId(id))
                    .type(types)
                    .properties(json)
                    .expirationDate(expirationDate)
                    .seal(storepass);

            this.addCredential(vc);
        } catch (ignore) {
            // MalformedCredentialException
            throw new UnknownInternalException(ignore);
        }

        return this;
    } */

    /**
     * Remove Credential with the specified id.
     *
     * @param id the Credential id
     * @return the DID Document Builder
     */
    public removeCredential(id: DIDURL): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid credential id");

        if (this.document.credentials == null || this.document.credentials.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        if (this.document.credentials.delete(this.canonicalId(id)) != null)
            this.invalidateProof();
        else
            throw new DIDObjectNotExistException(id.toString());

        return this;
    }

    /**
     * Add Service.
     *
     * @param id the specified Service id
     * @param type the Service type
     * @param endpoint the service point's adderss
     * @return the DID Document Builder
     */
    public addService(id: DIDURL | string, type: string, endpoint: string, properties?: JSONObject): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (typeof id === "string")
            id = this.canonicalId(id);

        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
            "Invalid publicKey id");
        checkArgument(type != null && !type.isEmpty(), "Invalid type");
        checkArgument(endpoint != null && !endpoint.isEmpty(), "Invalid endpoint");

        let svc = new DIDDocument.Service(this.canonicalId(id), type, endpoint, properties);
        if (this.document.services == null)
            this.document.services = new Map<DIDURL, DIDDocument.Service>();
        else {
            if (this.document.services.has(svc.getId()))
                throw new DIDObjectAlreadyExistException("Service '"
                    + svc.getId() + "' already exist.");
        }

        this.document.services.set(svc.getId(), svc);
        this.invalidateProof();

        return this;
    }

    /**
     * Add Service.
     *
     * @param id the specified Service id string
     * @param type the Service type
     * @param endpoint the service point's adderss
     * @return the DID Document Builder
     */
    /* public addService(id: string, type: string, endpoint: string): DIDDocumentBuilder {
        return addService(canonicalId(id), type, endpoint, null);
    } */

    /**
     * Remove the Service with the specified id.
     *
     * @param id the Service id
     * @return the DID Document Builder
     */
    public removeService(id: DIDURL): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(id != null, "Invalid credential id");

        if (this.document.services == null || this.document.services.size == 0)
            throw new DIDObjectNotExistException(id.toString());

        if (this.document.services.delete(this.canonicalId(id)) != null)
            this.invalidateProof();
        else
            throw new DIDObjectNotExistException(id.toString());

        return this;
    }

    private getMaxExpires(): Date {
        return dayjs().add(Constants.MAX_VALID_YEARS, 'years').toDate();
    }

    /**
     * Set the current time to be expires time for DID Document Builder.
     *
     * @return the DID Document Builder
     */
    public setDefaultExpires(): DIDDocumentBuilder {
        this.checkNotSealed();

        this.document.expires = this.getMaxExpires();
        this.invalidateProof();

        return this;
    }

    /**
     * Set the specified time to be expires time for DID Document Builder.
     *
     * @param expires the specified time
     * @return the DID Document Builder
     */
    public setExpires(expires: Date): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(expires != null, "Invalid expires");

        if (dayjs(expires).isAfter(this.getMaxExpires()))
            throw new IllegalArgumentException("Invalid expires, out of range.");

        this.document.expires = expires;
        this.invalidateProof();

        return this;
    }

    /**
     * Remove the proof that created by the specific controller.
     *
     * @param controller the controller's DID
     * @return the DID Document Builder
     */
    public removeProof(controller: DID): DIDDocumentBuilder {
        this.checkNotSealed();
        checkArgument(controller != null, "Invalid controller");

        if (this.document.proofs == null || this.document.proofs.size == 0)
            return this;

        if (this.document.proofs.delete(controller) == null)
            throw new DIDObjectNotExistException("No proof signed by: " + controller);

        return this;
    }

    private sanitize() {
        if (this.document.isCustomizedDid()) {
            if (this.document.controllers == null || this.document.controllers.length == 0)
                throw new MalformedDocumentException("Missing controllers");

            if (this.document.controllers.length > 1) {
                if (this.document.multisig == null)
                    throw new MalformedDocumentException("Missing multisig");

                if (this.document.multisig.n() != this.document.controllers.length)
                    throw new MalformedDocumentException("Invalid multisig, not matched with controllers");
            } else {
                if (this.document.multisig != null)
                    throw new MalformedDocumentException("Invalid multisig");
            }
        }

        let sigs = this.document.multisig == null ? 1 : this.document.multisig.m();
        if (this.document.proofs != null && this.document.proofs.size == sigs)
            throw new AlreadySealedException(this.getSubject().toString());

        if (this.document.controllers == null || this.document.controllers.length == 0) {
            this.document.controllers = [];
            this.document.controllerDocs = new Map();
        } else {
            Collections.sort(this.document.controllers);
        }

        if (this.document.publicKeys == null || this.document.publicKeys.size == 0) {
            this.document.publicKeys = new Map();
            this.document._publickeys = [];
            this.document._authentications = [];
            this.document._authorizations = [];
        } else {
            this.document._publickeys = Array.from(this.document.publicKeys.values());

            this.document._authentications = [];
            this.document._authorizations = [];

            for (let pk of this.document.publicKeys.values()) {
                if (pk.isAuthenticationKey())
                    this.document._authentications.push(DIDDocument.PublicKeyReference.newWithKey(pk));

                if (pk.isAuthorizationKey())
                    this.document._authorizations.push(DIDDocument.PublicKeyReference.newWithKey(pk));
            }

            if (this.document._authentications.length == 0)
                this.document._authentications = [];

            if (this.document._authentications.length == 0)
                this.document._authorizations = [];
        }

        if (this.document.credentials == null || this.document.credentials.size == 0) {
            this.document.credentials = new Map();
            this.document._credentials = [];
        } else {
            this.document._credentials = Array.from(this.document.credentials.values());
        }

        if (this.document.services == null || this.document.services.size == 0) {
            this.document.services = new Map();
            this.document._services = [];
        } else {
            this.document._services = Array.from(this.document.services.values());
        }

        if (this.document.proofs == null || this.document.proofs.size == 0) {
            if (this.document.getExpires() == null)
                this.setDefaultExpires();
        }

        if (this.document.proofs == null)
            this.document.proofs = new Map<DID, DIDDocument.Proof>();

        this.document._proofs = null;
    }

    /**
     * Seal the document object, attach the generated proof to the
     * document.
     *
     * @param storepass the password for DIDStore
     * @return the DIDDocument object
     * @throws InvalidKeyException if no valid sign key to seal the document
     * @throws MalformedDocumentException if the DIDDocument is malformed
     * @throws DIDStoreException if an error occurs when access DID store
     */
    public seal(storepass: string): DIDDocument {
        this.checkNotSealed();
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

        this.sanitize();

        let signerDoc = this.document.isCustomizedDid() ? this.controllerDoc : this.document;
        let signKey = signerDoc.getDefaultPublicKeyId();

        if (this.document.proofs.has(signerDoc.getSubject()))
            throw new AlreadySignedException(signerDoc.getSubject().toString());

        let json = this.document.serialize(true);
        let sig = this.document.signWithId(signKey, storepass, json.getBytes());
        let proof = new DIDDocument.Proof(signKey, sig);
        this.document.proofs.set(proof.getCreator().getDid(), proof);
        this.document._proofs = Array.from(this.document.proofs.values());
        Collections.sort(this.document._proofs);

        // Invalidate builder
        let doc: DIDDocument = this.document;
        this.document = null;

        return doc;
    }
}