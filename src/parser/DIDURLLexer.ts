// Generated from src/parser/DIDURL.g4 by ANTLR 4.9.0-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { CharStream } from "antlr4ts/CharStream";
import { Lexer } from "antlr4ts/Lexer";
import { LexerATNSimulator } from "antlr4ts/atn/LexerATNSimulator";
import { NotNull } from "antlr4ts/Decorators";
import { Override } from "antlr4ts/Decorators";
import { RuleContext } from "antlr4ts/RuleContext";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";


export class DIDURLLexer extends Lexer {
	public static readonly T__0 = 1;
	public static readonly T__1 = 2;
	public static readonly T__2 = 3;
	public static readonly T__3 = 4;
	public static readonly T__4 = 5;
	public static readonly T__5 = 6;
	public static readonly T__6 = 7;
	public static readonly T__7 = 8;
	public static readonly STRING = 9;
	public static readonly HEX = 10;
	public static readonly SPACE = 11;

	// tslint:disable:no-trailing-whitespace
	public static readonly channelNames: string[] = [
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN",
	];

	// tslint:disable:no-trailing-whitespace
	public static readonly modeNames: string[] = [
		"DEFAULT_MODE",
	];

	public static readonly ruleNames: string[] = [
		"T__0", "T__1", "T__2", "T__3", "T__4", "T__5", "T__6", "T__7", "STRING", 
		"HEX", "SPACE",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, "';'", "'/'", "'?'", "'#'", "'did'", "':'", "'='", "'&'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, "STRING", "HEX", "SPACE",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(DIDURLLexer._LITERAL_NAMES, DIDURLLexer._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return DIDURLLexer.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace


	constructor(input: CharStream) {
		super(input);
		this._interp = new LexerATNSimulator(DIDURLLexer._ATN, this);
	}

	// @Override
	public get grammarFileName(): string { return "DIDURL.g4"; }

	// @Override
	public get ruleNames(): string[] { return DIDURLLexer.ruleNames; }

	// @Override
	public get serializedATN(): string { return DIDURLLexer._serializedATN; }

	// @Override
	public get channelNames(): string[] { return DIDURLLexer.channelNames; }

	// @Override
	public get modeNames(): string[] { return DIDURLLexer.modeNames; }

	public static readonly _serializedATN: string =
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x02\rB\b\x01\x04" +
		"\x02\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04" +
		"\x07\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x03\x02\x03" +
		"\x02\x03\x03\x03\x03\x03\x04\x03\x04\x03\x05\x03\x05\x03\x06\x03\x06\x03" +
		"\x06\x03\x06\x03\x07\x03\x07\x03\b\x03\b\x03\t\x03\t\x03\n\x03\n\x05\n" +
		".\n\n\x03\n\x03\n\x07\n2\n\n\f\n\x0E\n5\v\n\x03\v\x03\v\x03\v\x06\v:\n" +
		"\v\r\v\x0E\v;\x03\f\x06\f?\n\f\r\f\x0E\f@\x02\x02\x02\r\x03\x02\x03\x05" +
		"\x02\x04\x07\x02\x05\t\x02\x06\v\x02\x07\r\x02\b\x0F\x02\t\x11\x02\n\x13" +
		"\x02\v\x15\x02\f\x17\x02\r\x03\x02\x06\x06\x022;C\\c|\x80\x80\x06\x02" +
		"/02;C\\c|\x05\x022;CHch\x05\x02\v\f\x0F\x0F\"\"\x02F\x02\x03\x03\x02\x02" +
		"\x02\x02\x05\x03\x02\x02\x02\x02\x07\x03\x02\x02\x02\x02\t\x03\x02\x02" +
		"\x02\x02\v\x03\x02\x02\x02\x02\r\x03\x02\x02\x02\x02\x0F\x03\x02\x02\x02" +
		"\x02\x11\x03\x02\x02\x02\x02\x13\x03\x02\x02\x02\x02\x15\x03\x02\x02\x02" +
		"\x02\x17\x03\x02\x02\x02\x03\x19\x03\x02\x02\x02\x05\x1B\x03\x02\x02\x02" +
		"\x07\x1D\x03\x02\x02\x02\t\x1F\x03\x02\x02\x02\v!\x03\x02\x02\x02\r%\x03" +
		"\x02\x02\x02\x0F\'\x03\x02\x02\x02\x11)\x03\x02\x02\x02\x13-\x03\x02\x02" +
		"\x02\x159\x03\x02\x02\x02\x17>\x03\x02\x02\x02\x19\x1A\x07=\x02\x02\x1A" +
		"\x04\x03\x02\x02\x02\x1B\x1C\x071\x02\x02\x1C\x06\x03\x02\x02\x02\x1D" +
		"\x1E\x07A\x02\x02\x1E\b\x03\x02\x02\x02\x1F \x07%\x02\x02 \n\x03\x02\x02" +
		"\x02!\"\x07f\x02\x02\"#\x07k\x02\x02#$\x07f\x02\x02$\f\x03\x02\x02\x02" +
		"%&\x07<\x02\x02&\x0E\x03\x02\x02\x02\'(\x07?\x02\x02(\x10\x03\x02\x02" +
		"\x02)*\x07(\x02\x02*\x12\x03\x02\x02\x02+.\t\x02\x02\x02,.\x05\x15\v\x02" +
		"-+\x03\x02\x02\x02-,\x03\x02\x02\x02.3\x03\x02\x02\x02/2\t\x03\x02\x02" +
		"02\x05\x15\v\x021/\x03\x02\x02\x0210\x03\x02\x02\x0225\x03\x02\x02\x02" +
		"31\x03\x02\x02\x0234\x03\x02\x02\x024\x14\x03\x02\x02\x0253\x03\x02\x02" +
		"\x0267\x07\'\x02\x0278\t\x04\x02\x028:\t\x04\x02\x0296\x03\x02\x02\x02" +
		":;\x03\x02\x02\x02;9\x03\x02\x02\x02;<\x03\x02\x02\x02<\x16\x03\x02\x02" +
		"\x02=?\t\x05\x02\x02>=\x03\x02\x02\x02?@\x03\x02\x02\x02@>\x03\x02\x02" +
		"\x02@A\x03\x02\x02\x02A\x18\x03\x02\x02\x02\b\x02-13;@\x02";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!DIDURLLexer.__ATN) {
			DIDURLLexer.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(DIDURLLexer._serializedATN));
		}

		return DIDURLLexer.__ATN;
	}

}

