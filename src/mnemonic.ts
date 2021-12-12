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

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import { entropyToMnemonic, generateMnemonic, mnemonicToSeedSync, validateMnemonic, wordlists } from "bip39";
import { MnemonicException } from "./exceptions/exceptions";
import { checkArgument } from "./internals";


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

    private static TWELVE_WORDS_ENTROPY = 128;

    private static WORDLISTS: { [index: string]: string[] } = {
        "english": wordlists.english,
        "czech": wordlists.czech,
        "chinese_simplified": wordlists.chinese_simplified,
        "chinese_traditional": wordlists.chinese_traditional,
        "french": wordlists.french,
        "italian": wordlists.italian,
        "japanese": wordlists.japanese,
        "spanish": wordlists.spanish,
        "korean": wordlists.korean
    }

    public static getInstance(language: string = Mnemonic.ENGLISH): Mnemonic {
        if (language === null || language === "") language = Mnemonic.ENGLISH;
        return new Mnemonic(language);
    }

    private constructor(private language: string = Mnemonic.ENGLISH) {
        if (!(language in Mnemonic.WORDLISTS))
            throw new MnemonicException("Unsupported language for mnemonic " + language);
    }

    /**
     * Generate a mnemonic from entropy.
     *
     * @param entropy the entropy data to generate mnemonic, or a random one will be used
     *
     * @return the mnemonic string
     * @throws DIDException generate Mnemonic into table failed.
     */
    public generate(entropy?: Buffer): string {
        if (entropy)
            return entropyToMnemonic(entropy, Mnemonic.WORDLISTS[this.language]);
        else
            return generateMnemonic(Mnemonic.TWELVE_WORDS_ENTROPY, null, Mnemonic.WORDLISTS[this.language]);
    }

    /**
     * Check that mnemonic string is valid or not.
     *
     * @param mnemonic the mnemonic string
     * @return the returned value is true if mnemonic is valid;
     *         the returned value is false if mnemonic is not valid.
     */
    public isValid(mnemonic: string): boolean {
        checkArgument(mnemonic != null && mnemonic !== "", "Invalid mnemonic");
        mnemonic = mnemonic.normalize("NFKD");
        return validateMnemonic(mnemonic, Mnemonic.WORDLISTS[this.language]);
    }

    public static getLanguage(mnemonic: string): string {
        checkArgument(mnemonic != null && mnemonic !== "", "Invalid menmonic");
        mnemonic = mnemonic.normalize("NFKD");
        for (let lang of Object.keys(Mnemonic.WORDLISTS)) {
            let m = new Mnemonic(lang);
            if (m.isValid(mnemonic))
                return lang;
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
    public static toSeed(mnemonic: string, passphrase: string): Buffer {
        checkArgument(mnemonic != null && mnemonic !== "", "Invalid menmonic");

        if (passphrase == null)
            passphrase = "";

        mnemonic = mnemonic.normalize("NFKD");
        passphrase = passphrase.normalize("NFKD");
        return mnemonicToSeedSync(mnemonic, passphrase)
    }
}
