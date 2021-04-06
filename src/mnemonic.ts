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

import { MnemonicException } from "./exceptions/exceptions";
import { checkArgument } from "./utils";

// TODO: REPLACE BITCOINJ WITH https://www.npmjs.com/package/hdkey-secp256r1 and https://github.com/backslash47/bip39-lite (jingyu)
// bip32 for Hierarchical Deterministic keys; bip39 for mnemonic

/**
 * The class represents the mnemonic content.
 */
export class Mnemonic {
	/**
	 * The default language is English.
	 */
	public static DEFAULT: string | null = null;

	/**
	 * language: "chinese_simplified"
	 */
	public static CHINESE_SIMPLIFIED = "chinese_simplified";

	/**
	 * language: "chinese_traditional"
	 */
	public static CHINESE_TRADITIONAL = "chinese_traditional";

	/**
	 * language: "czech"
	 */
	public static CZECH = "czech";

	/**
	 * language: "english"
	 */
	public static ENGLISH = "english";

	/**
	 * language: "french"
	 */
	public static FRENCH = "french";

	/**
	 * language: "italian"
	 */
	public static ITALIAN = "italian";

	/**
	 * language: "japanese"
	 */
	public static JAPANESE = "japanese";

	/**
	 * language: "korean"
	 */
	public static KOREAN = "korean";

	/**
	 * language: "spanish"
	 */
	public static SPANISH = "spanish";

	private static TWELVE_WORDS_ENTROPY = 16;

	private mc: MnemonicCode;

	private static mcTable = new Map<string, Mnemonic>(); //new Map<String, Mnemonic>(4);

	private constructor(mc: MnemonicCode) {
		this.mc = mc;
	}

	/**
	 * Get the Mnemonic's instance with the given language.
	 *
	 * @param language the language string
	 * @return the Mnemonic object
	 * @throws DIDException generate Mnemonic into table failed.
	 */
	public static getInstance(language: string = null): Mnemonic {
		if (language == null)
			language = Mnemonic.ENGLISH;

		if (this.mcTable.has(language))
			return this.mcTable.get(language);

		try {
			let mc =  MnemonicCode.INSTANCE;
			if (!language.isEmpty()) {
				InputStream is = MnemonicCode.openDefaultWords(language);
				mc = new MnemonicCode(is, null);
			}

			let m = new Mnemonic(mc);
			this.mcTable.set(language, m);
			return m;
		} catch (e) {
			// IOException | IllegalArgumentException
			throw new MnemonicException(e);
		}
	}

	/**
	 * Generate mnemonic.
	 *
	 * @return the mnemonic string
	 * @throws DIDException generate Mnemonic into table failed.
	 */
	public generate(): string {
		try {
			byte[] entropy = new byte[TWELVE_WORDS_ENTROPY];
			new SecureRandom().nextBytes(entropy);
			List<String> words = mc.toMnemonic(entropy);

			StringJoiner joiner = new StringJoiner(" ");
	        for (String word: words)
	            joiner.add(word);

	        return joiner.toString();
		} catch (org.bitcoinj.crypto.MnemonicException e) {
			throw new MnemonicException(e);
		}
	}

	/**
	 * Check that mnemonic string is valid or not.
	 *
	 * @param mnemonic the mnemonic string
	 * @return the returned value is true if mnemonic is valid;
	 *         the returned value is false if mnemonic is not valid.
	 */
	public isValid(mnemonic: string): boolean {
		checkArgument(mnemonic != null && mnemonic !== "", "Invalid menmonic");

    	mnemonic = Normalizer.normalize(mnemonic, Normalizer.Form.NFD);
		List<String> words = Arrays.asList(mnemonic.split(" "));

    	try {
	    	mc.check(words);
		    return true;
		} catch (org.bitcoinj.crypto.MnemonicException e) {
			return false;
		}
	}


	public static getLanguage(mnemonic: string): string {
		checkArgument(mnemonic != null && mnemonic !== "", "Invalid menmonic");

    	mnemonic = Normalizer.normalize(mnemonic, Normalizer.Form.NFD);
		List<String> words = Arrays.asList(mnemonic.split(" "));

		let langs = [ Mnemonic.ENGLISH, Mnemonic.SPANISH, Mnemonic.FRENCH, Mnemonic.CZECH, Mnemonic.ITALIAN,
			Mnemonic.CHINESE_SIMPLIFIED, Mnemonic.CHINESE_TRADITIONAL, Mnemonic.JAPANESE, Mnemonic.KOREAN ];

		for (let lang of langs) {
			let m = this.getInstance(lang);
	    	try {
				m.mc.check(words);
				return lang;
	    	} catch (org.bitcoinj.crypto.MnemonicException e) {
				continue;
			}
		}

		return null;
	}

	public static checkIsValid(mnemonic: string): boolean {
		checkArgument(mnemonic != null && mnemonic !== "", "Invalid menmonic");

		let lang = this.getLanguage(mnemonic);
		return lang != null;
	}

	/**
	 * Get seed from mnemonic and password.
	 *
	 * @param mnemonic the mnemonic string
	 * @param passphrase the password combine with mnemonic
	 * @return the original seed
	 */
	public static byte[] toSeed(String mnemonic, String passphrase) {
		checkArgument(mnemonic != null && !mnemonic.isEmpty(), "Invalid menmonic");

		if (passphrase == null)
			passphrase = "";

		mnemonic = Normalizer.normalize(mnemonic, Normalizer.Form.NFD);
    	passphrase = Normalizer.normalize(passphrase, Normalizer.Form.NFD);

		List<String> words = Arrays.asList(mnemonic.split(" "));

    	return MnemonicCode.toSeed(words, passphrase);
	}
}
