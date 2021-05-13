import { ConflictHandle } from "./conflicthandle";
import { DIDDocument } from "./diddocument";

export class DefaultConflictHandle implements ConflictHandle {

		private static instance: DefaultConflictHandle;

		private constructor() {}

		public static getInstance(): DefaultConflictHandle {
			if (!DefaultConflictHandle.instance) {
				DefaultConflictHandle.instance = new DefaultConflictHandle();
			}
			return DefaultConflictHandle.instance;
		}

		public merge(chainDoc: DIDDocument, localDoc: DIDDocument): DIDDocument {
			localDoc.getMetadata().setPublished(chainDoc.getMetadata().getPublished());
			localDoc.getMetadata().setSignature(chainDoc.getMetadata().getSignature());
			return localDoc;
		}
}