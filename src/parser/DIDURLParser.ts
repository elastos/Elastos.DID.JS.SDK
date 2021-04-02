// Generated from src/parser/DIDURL.g4 by ANTLR 4.9.0-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { FailedPredicateException } from "antlr4ts/FailedPredicateException";
import { NotNull } from "antlr4ts/Decorators";
import { NoViableAltException } from "antlr4ts/NoViableAltException";
import { Override } from "antlr4ts/Decorators";
import { Parser } from "antlr4ts/Parser";
import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { ParserATNSimulator } from "antlr4ts/atn/ParserATNSimulator";
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";
import { RecognitionException } from "antlr4ts/RecognitionException";
import { RuleContext } from "antlr4ts/RuleContext";
//import { RuleVersion } from "antlr4ts/RuleVersion";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { Token } from "antlr4ts/Token";
import { TokenStream } from "antlr4ts/TokenStream";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";

import { DIDURLListener } from "./DIDURLListener";
import { DIDURLVisitor } from "./DIDURLVisitor";


export class DIDURLParser extends Parser {
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
	public static readonly RULE_didurl = 0;
	public static readonly RULE_did = 1;
	public static readonly RULE_method = 2;
	public static readonly RULE_methodSpecificString = 3;
	public static readonly RULE_params = 4;
	public static readonly RULE_param = 5;
	public static readonly RULE_paramQName = 6;
	public static readonly RULE_paramMethod = 7;
	public static readonly RULE_paramName = 8;
	public static readonly RULE_paramValue = 9;
	public static readonly RULE_path = 10;
	public static readonly RULE_query = 11;
	public static readonly RULE_queryParam = 12;
	public static readonly RULE_queryParamName = 13;
	public static readonly RULE_queryParamValue = 14;
	public static readonly RULE_frag = 15;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"didurl", "did", "method", "methodSpecificString", "params", "param", 
		"paramQName", "paramMethod", "paramName", "paramValue", "path", "query", 
		"queryParam", "queryParamName", "queryParamValue", "frag",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, "';'", "'/'", "'?'", "'#'", "'did'", "':'", "'='", "'&'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, "STRING", "HEX", "SPACE",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(DIDURLParser._LITERAL_NAMES, DIDURLParser._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return DIDURLParser.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace

	// @Override
	public get grammarFileName(): string { return "DIDURL.g4"; }

	// @Override
	public get ruleNames(): string[] { return DIDURLParser.ruleNames; }

	// @Override
	public get serializedATN(): string { return DIDURLParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(DIDURLParser._ATN, this);
	}
	// @RuleVersion(0)
	public didurl(): DidurlContext {
		let _localctx: DidurlContext = new DidurlContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, DIDURLParser.RULE_didurl);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 33;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__4) {
				{
				this.state = 32;
				this.did();
				}
			}

			this.state = 37;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__0) {
				{
				this.state = 35;
				this.match(DIDURLParser.T__0);
				this.state = 36;
				this.params();
				}
			}

			this.state = 41;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__1) {
				{
				this.state = 39;
				this.match(DIDURLParser.T__1);
				this.state = 40;
				this.path();
				}
			}

			this.state = 45;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__2) {
				{
				this.state = 43;
				this.match(DIDURLParser.T__2);
				this.state = 44;
				this.query();
				}
			}

			this.state = 49;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__3) {
				{
				this.state = 47;
				this.match(DIDURLParser.T__3);
				this.state = 48;
				this.frag();
				}
			}

			this.state = 52;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.SPACE) {
				{
				this.state = 51;
				this.match(DIDURLParser.SPACE);
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public did(): DidContext {
		let _localctx: DidContext = new DidContext(this._ctx, this.state);
		this.enterRule(_localctx, 2, DIDURLParser.RULE_did);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 54;
			this.match(DIDURLParser.T__4);
			this.state = 55;
			this.match(DIDURLParser.T__5);
			this.state = 56;
			this.method();
			this.state = 57;
			this.match(DIDURLParser.T__5);
			this.state = 58;
			this.methodSpecificString();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public method(): MethodContext {
		let _localctx: MethodContext = new MethodContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, DIDURLParser.RULE_method);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 60;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public methodSpecificString(): MethodSpecificStringContext {
		let _localctx: MethodSpecificStringContext = new MethodSpecificStringContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, DIDURLParser.RULE_methodSpecificString);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 62;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public params(): ParamsContext {
		let _localctx: ParamsContext = new ParamsContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, DIDURLParser.RULE_params);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 64;
			this.param();
			this.state = 69;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === DIDURLParser.T__0) {
				{
				{
				this.state = 65;
				this.match(DIDURLParser.T__0);
				this.state = 66;
				this.param();
				}
				}
				this.state = 71;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public param(): ParamContext {
		let _localctx: ParamContext = new ParamContext(this._ctx, this.state);
		this.enterRule(_localctx, 10, DIDURLParser.RULE_param);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 72;
			this.paramQName();
			this.state = 75;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__6) {
				{
				this.state = 73;
				this.match(DIDURLParser.T__6);
				this.state = 74;
				this.paramValue();
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public paramQName(): ParamQNameContext {
		let _localctx: ParamQNameContext = new ParamQNameContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, DIDURLParser.RULE_paramQName);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 80;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 8, this._ctx) ) {
			case 1:
				{
				this.state = 77;
				this.paramMethod();
				this.state = 78;
				this.match(DIDURLParser.T__5);
				}
				break;
			}
			this.state = 82;
			this.paramName();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public paramMethod(): ParamMethodContext {
		let _localctx: ParamMethodContext = new ParamMethodContext(this._ctx, this.state);
		this.enterRule(_localctx, 14, DIDURLParser.RULE_paramMethod);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 84;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public paramName(): ParamNameContext {
		let _localctx: ParamNameContext = new ParamNameContext(this._ctx, this.state);
		this.enterRule(_localctx, 16, DIDURLParser.RULE_paramName);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 86;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public paramValue(): ParamValueContext {
		let _localctx: ParamValueContext = new ParamValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 18, DIDURLParser.RULE_paramValue);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 88;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public path(): PathContext {
		let _localctx: PathContext = new PathContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, DIDURLParser.RULE_path);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 90;
			this.match(DIDURLParser.STRING);
			this.state = 95;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === DIDURLParser.T__1) {
				{
				{
				this.state = 91;
				this.match(DIDURLParser.T__1);
				this.state = 92;
				this.match(DIDURLParser.STRING);
				}
				}
				this.state = 97;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let _localctx: QueryContext = new QueryContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, DIDURLParser.RULE_query);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 98;
			this.queryParam();
			this.state = 103;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === DIDURLParser.T__7) {
				{
				{
				this.state = 99;
				this.match(DIDURLParser.T__7);
				this.state = 100;
				this.queryParam();
				}
				}
				this.state = 105;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public queryParam(): QueryParamContext {
		let _localctx: QueryParamContext = new QueryParamContext(this._ctx, this.state);
		this.enterRule(_localctx, 24, DIDURLParser.RULE_queryParam);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 106;
			this.queryParamName();
			this.state = 109;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === DIDURLParser.T__6) {
				{
				this.state = 107;
				this.match(DIDURLParser.T__6);
				this.state = 108;
				this.queryParamValue();
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public queryParamName(): QueryParamNameContext {
		let _localctx: QueryParamNameContext = new QueryParamNameContext(this._ctx, this.state);
		this.enterRule(_localctx, 26, DIDURLParser.RULE_queryParamName);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 111;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public queryParamValue(): QueryParamValueContext {
		let _localctx: QueryParamValueContext = new QueryParamValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 28, DIDURLParser.RULE_queryParamValue);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 113;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public frag(): FragContext {
		let _localctx: FragContext = new FragContext(this._ctx, this.state);
		this.enterRule(_localctx, 30, DIDURLParser.RULE_frag);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 115;
			this.match(DIDURLParser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public static readonly _serializedATN: string =
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03\rx\x04\x02\t" +
		"\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07\t" +
		"\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04\x0E" +
		"\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x03\x02\x05\x02$\n\x02" +
		"\x03\x02\x03\x02\x05\x02(\n\x02\x03\x02\x03\x02\x05\x02,\n\x02\x03\x02" +
		"\x03\x02\x05\x020\n\x02\x03\x02\x03\x02\x05\x024\n\x02\x03\x02\x05\x02" +
		"7\n\x02\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x04\x03\x04" +
		"\x03\x05\x03\x05\x03\x06\x03\x06\x03\x06\x07\x06F\n\x06\f\x06\x0E\x06" +
		"I\v\x06\x03\x07\x03\x07\x03\x07\x05\x07N\n\x07\x03\b\x03\b\x03\b\x05\b" +
		"S\n\b\x03\b\x03\b\x03\t\x03\t\x03\n\x03\n\x03\v\x03\v\x03\f\x03\f\x03" +
		"\f\x07\f`\n\f\f\f\x0E\fc\v\f\x03\r\x03\r\x03\r\x07\rh\n\r\f\r\x0E\rk\v" +
		"\r\x03\x0E\x03\x0E\x03\x0E\x05\x0Ep\n\x0E\x03\x0F\x03\x0F\x03\x10\x03" +
		"\x10\x03\x11\x03\x11\x03\x11\x02\x02\x02\x12\x02\x02\x04\x02\x06\x02\b" +
		"\x02\n\x02\f\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02" +
		"\x1C\x02\x1E\x02 \x02\x02\x02\x02s\x02#\x03\x02\x02\x02\x048\x03\x02\x02" +
		"\x02\x06>\x03\x02\x02\x02\b@\x03\x02\x02\x02\nB\x03\x02\x02\x02\fJ\x03" +
		"\x02\x02\x02\x0ER\x03\x02\x02\x02\x10V\x03\x02\x02\x02\x12X\x03\x02\x02" +
		"\x02\x14Z\x03\x02\x02\x02\x16\\\x03\x02\x02\x02\x18d\x03\x02\x02\x02\x1A" +
		"l\x03\x02\x02\x02\x1Cq\x03\x02\x02\x02\x1Es\x03\x02\x02\x02 u\x03\x02" +
		"\x02\x02\"$\x05\x04\x03\x02#\"\x03\x02\x02\x02#$\x03\x02\x02\x02$\'\x03" +
		"\x02\x02\x02%&\x07\x03\x02\x02&(\x05\n\x06\x02\'%\x03\x02\x02\x02\'(\x03" +
		"\x02\x02\x02(+\x03\x02\x02\x02)*\x07\x04\x02\x02*,\x05\x16\f\x02+)\x03" +
		"\x02\x02\x02+,\x03\x02\x02\x02,/\x03\x02\x02\x02-.\x07\x05\x02\x02.0\x05" +
		"\x18\r\x02/-\x03\x02\x02\x02/0\x03\x02\x02\x0203\x03\x02\x02\x0212\x07" +
		"\x06\x02\x0224\x05 \x11\x0231\x03\x02\x02\x0234\x03\x02\x02\x0246\x03" +
		"\x02\x02\x0257\x07\r\x02\x0265\x03\x02\x02\x0267\x03\x02\x02\x027\x03" +
		"\x03\x02\x02\x0289\x07\x07\x02\x029:\x07\b\x02\x02:;\x05\x06\x04\x02;" +
		"<\x07\b\x02\x02<=\x05\b\x05\x02=\x05\x03\x02\x02\x02>?\x07\v\x02\x02?" +
		"\x07\x03\x02\x02\x02@A\x07\v\x02\x02A\t\x03\x02\x02\x02BG\x05\f\x07\x02" +
		"CD\x07\x03\x02\x02DF\x05\f\x07\x02EC\x03\x02\x02\x02FI\x03\x02\x02\x02" +
		"GE\x03\x02\x02\x02GH\x03\x02\x02\x02H\v\x03\x02\x02\x02IG\x03\x02\x02" +
		"\x02JM\x05\x0E\b\x02KL\x07\t\x02\x02LN\x05\x14\v\x02MK\x03\x02\x02\x02" +
		"MN\x03\x02\x02\x02N\r\x03\x02\x02\x02OP\x05\x10\t\x02PQ\x07\b\x02\x02" +
		"QS\x03\x02\x02\x02RO\x03\x02\x02\x02RS\x03\x02\x02\x02ST\x03\x02\x02\x02" +
		"TU\x05\x12\n\x02U\x0F\x03\x02\x02\x02VW\x07\v\x02\x02W\x11\x03\x02\x02" +
		"\x02XY\x07\v\x02\x02Y\x13\x03\x02\x02\x02Z[\x07\v\x02\x02[\x15\x03\x02" +
		"\x02\x02\\a\x07\v\x02\x02]^\x07\x04\x02\x02^`\x07\v\x02\x02_]\x03\x02" +
		"\x02\x02`c\x03\x02\x02\x02a_\x03\x02\x02\x02ab\x03\x02\x02\x02b\x17\x03" +
		"\x02\x02\x02ca\x03\x02\x02\x02di\x05\x1A\x0E\x02ef\x07\n\x02\x02fh\x05" +
		"\x1A\x0E\x02ge\x03\x02\x02\x02hk\x03\x02\x02\x02ig\x03\x02\x02\x02ij\x03" +
		"\x02\x02\x02j\x19\x03\x02\x02\x02ki\x03\x02\x02\x02lo\x05\x1C\x0F\x02" +
		"mn\x07\t\x02\x02np\x05\x1E\x10\x02om\x03\x02\x02\x02op\x03\x02\x02\x02" +
		"p\x1B\x03\x02\x02\x02qr\x07\v\x02\x02r\x1D\x03\x02\x02\x02st\x07\v\x02" +
		"\x02t\x1F\x03\x02\x02\x02uv\x07\v\x02\x02v!\x03\x02\x02\x02\x0E#\'+/3" +
		"6GMRaio";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!DIDURLParser.__ATN) {
			DIDURLParser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(DIDURLParser._serializedATN));
		}

		return DIDURLParser.__ATN;
	}

}

export class DidurlContext extends ParserRuleContext {
	public did(): DidContext | undefined {
		return this.tryGetRuleContext(0, DidContext);
	}
	public params(): ParamsContext | undefined {
		return this.tryGetRuleContext(0, ParamsContext);
	}
	public path(): PathContext | undefined {
		return this.tryGetRuleContext(0, PathContext);
	}
	public query(): QueryContext | undefined {
		return this.tryGetRuleContext(0, QueryContext);
	}
	public frag(): FragContext | undefined {
		return this.tryGetRuleContext(0, FragContext);
	}
	public SPACE(): TerminalNode | undefined { return this.tryGetToken(DIDURLParser.SPACE, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_didurl; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterDidurl) {
			listener.enterDidurl(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitDidurl) {
			listener.exitDidurl(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitDidurl) {
			return visitor.visitDidurl(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DidContext extends ParserRuleContext {
	public method(): MethodContext {
		return this.getRuleContext(0, MethodContext);
	}
	public methodSpecificString(): MethodSpecificStringContext {
		return this.getRuleContext(0, MethodSpecificStringContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_did; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterDid) {
			listener.enterDid(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitDid) {
			listener.exitDid(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitDid) {
			return visitor.visitDid(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class MethodContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_method; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterMethod) {
			listener.enterMethod(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitMethod) {
			listener.exitMethod(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitMethod) {
			return visitor.visitMethod(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class MethodSpecificStringContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_methodSpecificString; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterMethodSpecificString) {
			listener.enterMethodSpecificString(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitMethodSpecificString) {
			listener.exitMethodSpecificString(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitMethodSpecificString) {
			return visitor.visitMethodSpecificString(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamsContext extends ParserRuleContext {
	public param(): ParamContext[];
	public param(i: number): ParamContext;
	public param(i?: number): ParamContext | ParamContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ParamContext);
		} else {
			return this.getRuleContext(i, ParamContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_params; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterParams) {
			listener.enterParams(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitParams) {
			listener.exitParams(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitParams) {
			return visitor.visitParams(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamContext extends ParserRuleContext {
	public paramQName(): ParamQNameContext {
		return this.getRuleContext(0, ParamQNameContext);
	}
	public paramValue(): ParamValueContext | undefined {
		return this.tryGetRuleContext(0, ParamValueContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_param; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterParam) {
			listener.enterParam(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitParam) {
			listener.exitParam(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitParam) {
			return visitor.visitParam(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamQNameContext extends ParserRuleContext {
	public paramName(): ParamNameContext {
		return this.getRuleContext(0, ParamNameContext);
	}
	public paramMethod(): ParamMethodContext | undefined {
		return this.tryGetRuleContext(0, ParamMethodContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_paramQName; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterParamQName) {
			listener.enterParamQName(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitParamQName) {
			listener.exitParamQName(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitParamQName) {
			return visitor.visitParamQName(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamMethodContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_paramMethod; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterParamMethod) {
			listener.enterParamMethod(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitParamMethod) {
			listener.exitParamMethod(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitParamMethod) {
			return visitor.visitParamMethod(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamNameContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_paramName; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterParamName) {
			listener.enterParamName(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitParamName) {
			listener.exitParamName(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitParamName) {
			return visitor.visitParamName(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamValueContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_paramValue; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterParamValue) {
			listener.enterParamValue(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitParamValue) {
			listener.exitParamValue(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitParamValue) {
			return visitor.visitParamValue(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class PathContext extends ParserRuleContext {
	public STRING(): TerminalNode[];
	public STRING(i: number): TerminalNode;
	public STRING(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(DIDURLParser.STRING);
		} else {
			return this.getToken(DIDURLParser.STRING, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_path; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterPath) {
			listener.enterPath(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitPath) {
			listener.exitPath(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitPath) {
			return visitor.visitPath(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryContext extends ParserRuleContext {
	public queryParam(): QueryParamContext[];
	public queryParam(i: number): QueryParamContext;
	public queryParam(i?: number): QueryParamContext | QueryParamContext[] {
		if (i === undefined) {
			return this.getRuleContexts(QueryParamContext);
		} else {
			return this.getRuleContext(i, QueryParamContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_query; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterQuery) {
			listener.enterQuery(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitQuery) {
			listener.exitQuery(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitQuery) {
			return visitor.visitQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryParamContext extends ParserRuleContext {
	public queryParamName(): QueryParamNameContext {
		return this.getRuleContext(0, QueryParamNameContext);
	}
	public queryParamValue(): QueryParamValueContext | undefined {
		return this.tryGetRuleContext(0, QueryParamValueContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_queryParam; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterQueryParam) {
			listener.enterQueryParam(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitQueryParam) {
			listener.exitQueryParam(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitQueryParam) {
			return visitor.visitQueryParam(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryParamNameContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_queryParamName; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterQueryParamName) {
			listener.enterQueryParamName(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitQueryParamName) {
			listener.exitQueryParamName(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitQueryParamName) {
			return visitor.visitQueryParamName(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryParamValueContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_queryParamValue; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterQueryParamValue) {
			listener.enterQueryParamValue(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitQueryParamValue) {
			listener.exitQueryParamValue(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitQueryParamValue) {
			return visitor.visitQueryParamValue(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FragContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(DIDURLParser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return DIDURLParser.RULE_frag; }
	// @Override
	public enterRule(listener: DIDURLListener): void {
		if (listener.enterFrag) {
			listener.enterFrag(this);
		}
	}
	// @Override
	public exitRule(listener: DIDURLListener): void {
		if (listener.exitFrag) {
			listener.exitFrag(this);
		}
	}
	// @Override
	public accept<Result>(visitor: DIDURLVisitor<Result>): Result {
		if (visitor.visitFrag) {
			return visitor.visitFrag(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


