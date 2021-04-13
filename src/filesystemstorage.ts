/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Logger } from "./logger";

const log = new Logger("FileSystemStorage");

/*
 * FileSystem DID Store: storage layout
 *
 *  + DIDStore root
 *    + data 						    [Current data root folder]
 *      - .metadata						[DIDStore metadata]
 *      + roots							[Root identities folder]
 *        + xxxxxxx0					[Root identity folder named by id]
 *          - .metadata					[RootIdentity metadata]
 *          - mnemonic					[Encrypted mnemonic file, OPTIONAL]
 *          - private					[Encrypted root private key file]
 *          - public					[Pre-derived public key file]
 *          - index						[Last derive index]
 *        + ...
 *        + xxxxxxxN
 *      + ids							[DIDs folder]
 *        + ixxxxxxxxxxxxxxx0 			[DID root, named by id specific string]
 *          - .metadata					[Meta for DID, json format, OPTIONAL]
 *          - document					[DID document, json format]
 *          + credentials				[Credentials root, OPTIONAL]
 *            + credential-id-0         [Credential root, named by id' fragment]
 *              - .metadata				[Meta for credential, json format, OPTONAL]
 *              - credential			[Credential, json format]
 *            + ...
 *            + credential-id-N
 *          + privatekeys				[Private keys root, OPTIONAL]
 *            - privatekey-id-0			[Encrypted private key, named by pk' id]
 *            - ...
 *            - privatekey-id-N
 *        + ...
 *        + ixxxxxxxxxxxxxxxN
 */
class FileSystemStorage implements DIDStorage {
	private static DATA_DIR = "data";

	private static ROOT_IDENTITIES_DIR = "roots";

	private static ROOT_IDENTITY_MNEMONIC_FILE = "mnemonic";
	private static ROOT_IDENTITY_PRIVATEKEY_FILE = "private";
	private static ROOT_IDENTITY_PUBLICKEY_FILE = "public";
	private static ROOT_IDENTITY_INDEX_FILE = "index";

	private static DID_DIR = "ids";
	private static DOCUMENT_FILE = "document";

	private static CREDENTIALS_DIR = "credentials";
	private static CREDENTIAL_FILE = "credential";

	private static PRIVATEKEYS_DIR = "privatekeys";

	private static METADATA = ".metadata";

	private static JOURNAL_SUFFIX = ".journal";

	private File storeRoot;
	private String currentDataDir;

	protected constructor(dir: File) {
		this.storeRoot = dir;
		this.currentDataDir = DATA_DIR;

		if (this.storeRoot.exists())
			this.checkStore();
		else
			this.initializeStore();
	}

	private initializeStore() {
		try {
			log.debug("Initializing DID store at {}", this.storeRoot.getAbsolutePath());

			this.storeRoot.mkdirs();

			DIDStore.Metadata metadata = new DIDStore.Metadata();

			File file = getFile(true, currentDataDir, METADATA);
			metadata.serialize(file);
		} catch (e) {
			// IOException
			log.error("Initialize DID store error", e);
			throw new DIDStorageException("Initialize DIDStore \""
					+ storeRoot.getAbsolutePath() + "\" error.", e);
		}
	}

	private checkStore() {
		log.debug("Checking DID store at {}", this.storeRoot.getAbsolutePath());

		if (this.storeRoot.isFile()) {
			log.error("Path {} not a directory", this.storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \""
					+ this.storeRoot.getAbsolutePath() + "\".");
		}

		this.postOperations();

		File file = getDir(currentDataDir);
		if (!file.exists()) {
			File oldMetadata = getFile(".meta");
			if (oldMetadata.exists()) {
				if (oldMetadata.isFile()) {
					upgradeFromV2();
				} else {
					log.error("Path {} not a DID store", storeRoot.getAbsolutePath());
					throw new DIDStorageException("Invalid DIDStore \""
							+ storeRoot.getAbsolutePath() + "\".");
				}
			} else {
				String[] files = storeRoot.list();
				if (files == null || files.length == 0) {
					// if an empty folder
					initializeStore();
					return;
				} else {
					log.error("Path {} not a DID store", storeRoot.getAbsolutePath());
					throw new DIDStorageException("Invalid DIDStore \""
							+ storeRoot.getAbsolutePath() + "\".");
				}
			}
		}

		if (!file.isDirectory()) {
			log.error("Path {} not a DID store, missing data directory",
					storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \""
					+ storeRoot.getAbsolutePath() + "\".");
		}

		file = getFile(false, currentDataDir, METADATA);
		if (!file.exists() || !file.isFile()) {
			log.error("Path {} not a DID store, missing store metadata",
					storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \""
					+ storeRoot.getAbsolutePath() + "\".");
		}

		try {
			let metadata = DIDStore.Metadata.parse(file, DIDStore.Metadata.class);

			if (!metadata.getType().equals(DIDStore.DID_STORE_TYPE))
				throw new DIDStorageException("Unknown DIDStore type");

			if (metadata.getVersion() != DIDStore.DID_STORE_VERSION)
				throw new DIDStorageException("Unsupported DIDStore version");
		} catch (DIDSyntaxException | IOException e) {
			log.error("Check DID store error, failed load store metadata", e);
			throw new DIDStorageException("Can not check the store metadata", e);
		}
	}

	private static toPath(id: DIDURL): string {
		let path = id.toString(id.getDid());
		return path.replace(';', '.').replace('/', '_').replace('?', '-');
	}

	private static toDIDURL(did: DID, path: string): DIDURL {
		path = path.replace('.', ';').replace('_', '/').replace('-', '?');
		return new DIDURL(did, path);
	}

	private static void deleteFile(File file) {
		if (file.isDirectory()) {
			File[] children = file.listFiles();
			for (File child : children)
				deleteFile(child);
		}

		file.delete();
	}

	private static void copyFile(File src, File dest) throws IOException {
	    FileInputStream in = null;
	    FileOutputStream out = null;
	    try {
	        in = new FileInputStream(src);
	        out = new FileOutputStream(dest);
	        out.getChannel().transferFrom(in.getChannel(), 0,
	        		in.getChannel().size());
		} finally {
			if (in != null)
				in.close();

			if (out != null)
				out.close();
		}
	}

	private File getFile(String ... path) {
		return getFile(false, path);
	}

	private File getFile(boolean create, String ... path) {
		StringBuffer relPath = new StringBuffer(256);
		File file;

		relPath.append(storeRoot.getAbsolutePath());
		int lastIndex = path.length - 1;
		for (int i = 0; i <= lastIndex; i++) {
			relPath.append(File.separator);
			relPath.append(path[i]);

			if (create) {
				boolean isDir = (i < lastIndex);

				file = new File(relPath.toString());
				if (file.exists() && file.isDirectory() != isDir)
					deleteFile(file);
			}
		}

		file = new File(relPath.toString());
		if (create)
			file.getParentFile().mkdirs();

		return file;
	}

	private File getDir(String ... path) {
		StringBuffer relPath = new StringBuffer(256);

		relPath.append(storeRoot.getAbsolutePath());
		for (String p : path) {
			relPath.append(File.separator);
			relPath.append(p);
		}

		return new File(relPath.toString());
	}

	private static void writeText(File file, String text) throws IOException {
		FileWriter writer = null;
		try {
			writer = new FileWriter(file);
			writer.write(text);
		} finally {
			if (writer != null)
				writer.close();
		}
	}

	private static String readText(File file) throws IOException {
		BufferedReader reader = null;
		try {
			reader = new BufferedReader(new FileReader(file));
			return reader.readLine();
		} finally {
			if (reader != null)
				reader.close();
		}
	}

	@Override
	public String getLocation() {
		return storeRoot.toString();
	}

	@Override
	public void storeMetadata(DIDStore.Metadata metadata) throws DIDStorageException {
		try {
			File file = getFile(true, currentDataDir, METADATA);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
		} catch (IOException e) {
			throw new DIDStorageException("Store DIDStore metadata error", e);
		}
	}

	@Override
	public DIDStore.Metadata loadMetadata() throws DIDStorageException {
		try {
			File file = getFile(currentDataDir, METADATA);
			DIDStore.Metadata metadata = null;
			if (file.exists())
				metadata = DIDStore.Metadata.parse(file, DIDStore.Metadata.class);

			return metadata;
		} catch (DIDSyntaxException | IOException e) {
			throw new DIDStorageException("Load DIDStore metadata error", e);
		}
	}

	private File getRootIdentityFile(String id, String file, boolean create) {
		return getFile(create, currentDataDir, ROOT_IDENTITIES_DIR, id, file);
	}

	private File getRootIdentityDir(String id) {
		return getDir(currentDataDir, ROOT_IDENTITIES_DIR, id);
	}

	@Override
	public void storeRootIdentityMetadata(String id, RootIdentity.Metadata metadata)
			throws DIDStorageException {
		try {
			File file = getRootIdentityFile(id, METADATA, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
		} catch (IOException e) {
			throw new DIDStorageException("Store root identity metadata error: " + id, e);
		}
	}

	@Override
	public RootIdentity.Metadata loadRootIdentityMetadata(String id) throws DIDStorageException {
		try {
			File file = getRootIdentityFile(id, METADATA, false);
			RootIdentity.Metadata metadata = null;
			if (file.exists())
				metadata = RootIdentity.Metadata.parse(file, RootIdentity.Metadata.class);

			return metadata;
		} catch (DIDSyntaxException | IOException e) {
			throw new DIDStorageException("Load root identity metadata error: " + id, e);
		}
	}

	@Override
	public void storeRootIdentity(String id, String mnemonic, String privateKey,
			String publicKey, int index) throws DIDStorageException {
		try {
			File file;

			if (mnemonic != null) {
				file = getRootIdentityFile(id, ROOT_IDENTITY_MNEMONIC_FILE, true);
				writeText(file, mnemonic);
			}

			if (privateKey != null) {
				file = getRootIdentityFile(id, ROOT_IDENTITY_PRIVATEKEY_FILE, true);
				writeText(file, privateKey);
			}

			if (publicKey != null) {
				file = getRootIdentityFile(id, ROOT_IDENTITY_PUBLICKEY_FILE, true);
				writeText(file, publicKey);
			}

			file = getRootIdentityFile(id, ROOT_IDENTITY_INDEX_FILE, true);
			writeText(file, Integer.toString(index));
		} catch (IOException e) {
			throw new DIDStorageException("Store root identity error: " + id, e);
		}
	}

	@Override
	public RootIdentity loadRootIdentity(String id) throws DIDStorageException {
		try {
			File file = getRootIdentityFile(id, ROOT_IDENTITY_PUBLICKEY_FILE, false);
			if (!file.exists())
				return null;

			String publicKey = readText(file);
			file = getRootIdentityFile(id, ROOT_IDENTITY_INDEX_FILE, false);
			int index = Integer.valueOf(readText(file));

			return RootIdentity.create(publicKey, index);
		} catch (IOException e) {
			throw new DIDStorageException("Load public key for identity error: " + id, e);
		}
	}

	@Override
	public void updateRootIdentityIndex(String id, int index)
			throws DIDStorageException {
		try {
			File file = getRootIdentityFile(id, ROOT_IDENTITY_INDEX_FILE, false);
			writeText(file, Integer.toString(index));
		} catch (IOException e) {
			throw new DIDStorageException("Update index for indentiy error: " + id, e);
		}
	}

	@Override
	public String loadRootIdentityPrivateKey(String id) throws DIDStorageException {
		// TODO: support multiple named identity
		try {
			File file = getRootIdentityFile(id, ROOT_IDENTITY_PRIVATEKEY_FILE, false);
			if (!file.exists())
				return null;

			return readText(file);
		} catch (IOException e) {
			throw new DIDStorageException("Load private key for identity error: " + id, e);
		}
	}

	@Override
	public boolean deleteRootIdentity(String id) {
		File dir = getRootIdentityDir(id);
		if (dir.exists()) {
			deleteFile(dir);
			return true;
		} else {
			return false;
		}
	}

	@Override
	public List<RootIdentity> listRootIdentities() throws DIDStorageException {
		File dir = getDir(currentDataDir, ROOT_IDENTITIES_DIR);

		if (!dir.exists())
			return Collections.emptyList();

		File[] children = dir.listFiles((file) -> {
			return file.isDirectory();
		});

		if (children == null || children.length == 0)
			return Collections.emptyList();

		ArrayList<RootIdentity> ids = new ArrayList<RootIdentity>(children.length);
		for (File id : children) {
			RootIdentity identity = loadRootIdentity(id.getName());
			ids.add(identity);
		}

		return ids;
	}

	@Override
	public boolean containsRootIdenities() {
		File dir = getDir(currentDataDir, ROOT_IDENTITIES_DIR);
		if (!dir.exists())
			return false;

		File[] children = dir.listFiles((file) -> {
			return file.isDirectory();
		});

		return (children != null && children.length > 0);
	}

	@Override
	public String loadRootIdentityMnemonic(String id) throws DIDStorageException {
		try {
			File file = getRootIdentityFile(id, ROOT_IDENTITY_MNEMONIC_FILE, false);
			return readText(file);
		} catch (IOException e) {
			throw new DIDStorageException("Load mnemonic for identity error: " + id, e);
		}
	}

	private File getDidFile(DID did, boolean create) {
		return getFile(create, currentDataDir, DID_DIR, did.getMethodSpecificId(), DOCUMENT_FILE);
	}

	private File getDidMetadataFile(DID did, boolean create) {
		return getFile(create, currentDataDir, DID_DIR, did.getMethodSpecificId(), METADATA);
	}

	private File getDidDir(DID did) {
		return getDir(currentDataDir, DID_DIR, did.getMethodSpecificId());
	}

	@Override
	public void storeDidMetadata(DID did, DIDMetadata metadata) throws DIDStorageException {
		try {
			File file = getDidMetadataFile(did, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
		} catch (IOException e) {
			throw new DIDStorageException("Store DID metadata error: " + did, e);
		}
	}

	@Override
	public DIDMetadata loadDidMetadata(DID did) throws DIDStorageException {
		try {
			File file = getDidMetadataFile(did, false);
			DIDMetadata metadata = null;
			if (file.exists())
				metadata = DIDMetadata.parse(file, DIDMetadata.class);

			return metadata;
		} catch (DIDSyntaxException | IOException e) {
			throw new DIDStorageException("Load DID metadata error: " + did, e);
		}
	}

	@Override
	public void storeDid(DIDDocument doc) throws DIDStorageException {
		try {
			File file = getDidFile(doc.getSubject(), true);
			doc.serialize(file, true);
		} catch (IOException e) {
			throw new DIDStorageException("Store DID document error: " +
					doc.getSubject(), e);
		}
	}

	@Override
	public DIDDocument loadDid(DID did) throws DIDStorageException {
		try {
			File file = getDidFile(did, false);
			if (!file.exists())
				return null;

			return DIDDocument.parse(file);
		} catch (DIDSyntaxException | IOException e) {
			throw new DIDStorageException("Load DID document error: " + did, e);
		}
	}

	@Override
	public boolean deleteDid(DID did) {
		File dir = getDidDir(did);
		if (dir.exists()) {
			deleteFile(dir);
			return true;
		} else {
			return false;
		}
	}

	@Override
	public List<DID> listDids() {
		File dir = getDir(currentDataDir, DID_DIR);
		if (!dir.exists())
			return Collections.emptyList();

		File[] children = dir.listFiles((file) -> {
			return file.isDirectory();
		});

		if (children == null || children.length == 0)
			return Collections.emptyList();

		ArrayList<DID> dids = new ArrayList<DID>(children.length);
		for (File didRoot : children) {
			DID did = new DID(DID.METHOD, didRoot.getName());
			dids.add(did);
		}

		return dids;
	}

	private File getCredentialFile(DIDURL id, boolean create) {
		return getFile(create, currentDataDir, DID_DIR, id.getDid().getMethodSpecificId(),
				CREDENTIALS_DIR, toPath(id), CREDENTIAL_FILE);
	}

	private File getCredentialMetadataFile(DIDURL id, boolean create) {
		return getFile(create, currentDataDir, DID_DIR, id.getDid().getMethodSpecificId(),
				CREDENTIALS_DIR, toPath(id), METADATA);
	}

	private File getCredentialDir(DIDURL id) {
		return getDir(currentDataDir, DID_DIR, id.getDid().getMethodSpecificId(),
				CREDENTIALS_DIR, toPath(id));
	}

	private File getCredentialsDir(DID did) {
		return getDir(currentDataDir, DID_DIR, did.getMethodSpecificId(), CREDENTIALS_DIR);
	}

	@Override
	public void storeCredentialMetadata(DIDURL id, CredentialMetadata metadata)
			throws DIDStorageException {
		try {
			File file = getCredentialMetadataFile(id, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
		} catch (IOException e) {
			throw new DIDStorageException("Store credential metadata error: " + id, e);
		}
	}

	@Override
	public CredentialMetadata loadCredentialMetadata(DIDURL id)
			throws DIDStorageException {
		try {
			File file = getCredentialMetadataFile(id, false);
			if (!file.exists())
				return null;

			return CredentialMetadata.parse(file, CredentialMetadata.class);
		} catch (DIDSyntaxException | IOException e) {
			throw new DIDStorageException("Load credential metadata error: " + id, e);
		}
	}

	@Override
	public void storeCredential(VerifiableCredential credential)
			throws DIDStorageException {
		try {
			File file = getCredentialFile(credential.getId(), true);
			credential.serialize(file, true);
		} catch (IOException e) {
			throw new DIDStorageException("Store credential error: " +
					credential.getId(), e);
		}
	}

	@Override
	public VerifiableCredential loadCredential(DIDURL id)
			throws DIDStorageException {
		try {
			File file = getCredentialFile(id, false);
			if (!file.exists())
				return null;

			return VerifiableCredential.parse(file);
		} catch (DIDSyntaxException | IOException e) {
			throw new DIDStorageException("Load credential error: " + id, e);
		}
	}

	@Override
	public boolean containsCredentials(DID did) {
		File dir = getCredentialsDir(did);
		if (!dir.exists())
			return false;

		File[] creds = dir.listFiles((file) -> {
			return file.isDirectory();
		});

		return creds == null ? false : creds.length > 0;
	}

	@Override
	public boolean deleteCredential(DIDURL id) {
		File dir = getCredentialDir(id);
		if (dir.exists()) {
			deleteFile(dir);

			// Remove the credentials directory is no credential exists.
			dir = getCredentialsDir(id.getDid());
			if (dir.list().length == 0)
				dir.delete();

			return true;
		} else {
			return false;
		}
	}

	@Override
	public List<DIDURL> listCredentials(DID did) {
		File dir = getCredentialsDir(did);
		if (!dir.exists())
			return Collections.emptyList();

		File[] children = dir.listFiles((file) -> {
			return file.isDirectory();
		});

		if (children == null || children.length == 0)
			return Collections.emptyList();

		ArrayList<DIDURL> credentials = new ArrayList<DIDURL>(children.length);
		for (File credential : children)
			credentials.add(toDIDURL(did, credential.getName()));

		return credentials;
	}

	private File getPrivateKeyFile(DIDURL id, boolean create) {
		return getFile(create, currentDataDir, DID_DIR, id.getDid().getMethodSpecificId(),
				PRIVATEKEYS_DIR, toPath(id));
	}

	private File getPrivateKeysDir(DID did) {
		return getDir(currentDataDir, DID_DIR, did.getMethodSpecificId(), PRIVATEKEYS_DIR);
	}

	@Override
	public void storePrivateKey(DIDURL id, String privateKey)
			throws DIDStorageException {
		try {
			File file = getPrivateKeyFile(id, true);
			writeText(file, privateKey);
		} catch (IOException e) {
			throw new DIDStorageException("Store private key error: " + id, e);
		}
	}

	@Override
	public String loadPrivateKey(DIDURL id) throws DIDStorageException {
		try {
			File file = getPrivateKeyFile(id, false);
			if (!file.exists())
				return null;

			return readText(file);
		} catch (Exception e) {
			throw new DIDStorageException("Load private key error: " + id, e);
		}
	}

	@Override
	public boolean containsPrivateKeys(DID did) {
		File dir = getPrivateKeysDir(did);
		if (!dir.exists())
			return false;

		File[] keys = dir.listFiles((file) -> {
			return file.isFile();
		});

		return keys == null ? false : keys.length > 0;
	}

	@Override
	public boolean deletePrivateKey(DIDURL id) {
		File file = getPrivateKeyFile(id, false);
		if (file.exists()) {
			file.delete();

			// Remove the privatekeys directory is no privatekey exists.
			File dir = getPrivateKeysDir(id.getDid());
			if (dir.list().length == 0)
				dir.delete();

			return true;
		} else {
			return false;
		}
	}

	@Override
	public List<DIDURL> listPrivateKeys(DID did) throws DIDStorageException {
		File dir = getPrivateKeysDir(did);
		if (!dir.exists())
			return Collections.emptyList();

		File[] keys = dir.listFiles((file) -> {
			return file.isFile();
		});

		if (keys == null || keys.length == 0)
			return Collections.emptyList();

		ArrayList<DIDURL> sks = new ArrayList<DIDURL>(keys.length);
		for (File key : keys)
			sks.add(toDIDURL(did, key.getName()));

		return sks;
	}

	private boolean needReencrypt(File file) {
		String[] patterns = {
				// Root identity's private key
				"(.+)\\" + File.separator + DATA_DIR + "\\" + File.separator +
				ROOT_IDENTITIES_DIR + "\\" + File.separator + "(.+)\\" +
				File.separator + ROOT_IDENTITY_PRIVATEKEY_FILE,
				// Root identity's mnemonic
				"(.+)\\" + File.separator + DATA_DIR + "\\" + File.separator +
				ROOT_IDENTITIES_DIR + "\\" + File.separator + "(.+)\\" +
				File.separator + ROOT_IDENTITY_MNEMONIC_FILE,
				// DID's private keys
				"(.+)\\" + File.separator + DATA_DIR + "\\" + File.separator +
				DID_DIR + "\\" + File.separator + "(.+)\\" + File.separator +
				PRIVATEKEYS_DIR + "\\" + File.separator + "(.+)"
		};

		String path = file.getAbsolutePath();
		for (String pattern : patterns) {
			if (path.matches(pattern))
				return true;
		}

		return false;
	}

	private void copy(File src, File dest, ReEncryptor reEncryptor)
			throws IOException, DIDStoreException {
		if (src.isDirectory()) {
			if (!dest.exists()) {
				dest.mkdir();
			}

			String files[] = src.list();
			for (String file : files) {
				File srcFile = new File(src, file);
				File destFile = new File(dest, file);
				copy(srcFile, destFile, reEncryptor);
			}
		} else {
			if (needReencrypt(src)) {
				String text = readText(src);
				writeText(dest, reEncryptor.reEncrypt(text));
			} else {
			    copyFile(src, dest);
			}
		}
	}

	private void postChangePassword() {
		File dataDir = getDir(DATA_DIR);
		File dataJournal = getDir(DATA_DIR + JOURNAL_SUFFIX);

		int timestamp = (int)(System.currentTimeMillis() / 1000);
		File dataDeprecated = getDir(DATA_DIR + "_" + timestamp);

		File stageFile = getFile("postChangePassword");

		if (stageFile.exists()) {
			if (dataJournal.exists()) {
				if (dataDir.exists())
					dataDir.renameTo(dataDeprecated);

				dataJournal.renameTo(dataDir);
			}

			stageFile.delete();
		} else {
			if (dataJournal.exists())
				deleteFile(dataJournal);
		}
	}

	@Override
	public void changePassword(ReEncryptor reEncryptor)
			throws DIDStorageException {
		try {
			File dataDir = getDir(DATA_DIR);
			File dataJournal = getDir(DATA_DIR + JOURNAL_SUFFIX);

			copy(dataDir, dataJournal, reEncryptor);

			File stageFile = getFile(true, "postChangePassword");
			stageFile.createNewFile();
		} catch (DIDStoreException | IOException e) {
			throw new DIDStorageException("Change store password failed.");
		} finally {
			postChangePassword();
		}
	}

	private void postOperations() throws DIDStorageException {
		File stageFile = getFile("postChangePassword");
		if (stageFile.exists()) {
			postChangePassword();
			return;
		}
	}
}
