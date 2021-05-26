import type { DIDDocument } from "./internals";

/**
 * The interface for ConflictHandle to indicate how to resolve the conflict,
 * if the local document is different with the one resolved from chain.
 */
    export interface ConflictHandle {
    /**
     * The method to merge two did document.
     *
     * @param chainCopy the document from chain
     * @param localCopy the document from local device
     * @return the merged DIDDocument object
     */
    merge(chainCopy: DIDDocument, localCopy: DIDDocument): DIDDocument;
}
