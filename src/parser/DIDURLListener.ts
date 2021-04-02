// Generated from src/parser/DIDURL.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { DidurlContext } from "./DIDURLParser";
import { DidContext } from "./DIDURLParser";
import { MethodContext } from "./DIDURLParser";
import { MethodSpecificStringContext } from "./DIDURLParser";
import { ParamsContext } from "./DIDURLParser";
import { ParamContext } from "./DIDURLParser";
import { ParamQNameContext } from "./DIDURLParser";
import { ParamMethodContext } from "./DIDURLParser";
import { ParamNameContext } from "./DIDURLParser";
import { ParamValueContext } from "./DIDURLParser";
import { PathContext } from "./DIDURLParser";
import { QueryContext } from "./DIDURLParser";
import { QueryParamContext } from "./DIDURLParser";
import { QueryParamNameContext } from "./DIDURLParser";
import { QueryParamValueContext } from "./DIDURLParser";
import { FragContext } from "./DIDURLParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `DIDURLParser`.
 */
export interface DIDURLListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `DIDURLParser.didurl`.
	 * @param ctx the parse tree
	 */
	enterDidurl?: (ctx: DidurlContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.didurl`.
	 * @param ctx the parse tree
	 */
	exitDidurl?: (ctx: DidurlContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.did`.
	 * @param ctx the parse tree
	 */
	enterDid?: (ctx: DidContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.did`.
	 * @param ctx the parse tree
	 */
	exitDid?: (ctx: DidContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.method`.
	 * @param ctx the parse tree
	 */
	enterMethod?: (ctx: MethodContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.method`.
	 * @param ctx the parse tree
	 */
	exitMethod?: (ctx: MethodContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.methodSpecificString`.
	 * @param ctx the parse tree
	 */
	enterMethodSpecificString?: (ctx: MethodSpecificStringContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.methodSpecificString`.
	 * @param ctx the parse tree
	 */
	exitMethodSpecificString?: (ctx: MethodSpecificStringContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.params`.
	 * @param ctx the parse tree
	 */
	enterParams?: (ctx: ParamsContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.params`.
	 * @param ctx the parse tree
	 */
	exitParams?: (ctx: ParamsContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.param`.
	 * @param ctx the parse tree
	 */
	enterParam?: (ctx: ParamContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.param`.
	 * @param ctx the parse tree
	 */
	exitParam?: (ctx: ParamContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramQName`.
	 * @param ctx the parse tree
	 */
	enterParamQName?: (ctx: ParamQNameContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramQName`.
	 * @param ctx the parse tree
	 */
	exitParamQName?: (ctx: ParamQNameContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramMethod`.
	 * @param ctx the parse tree
	 */
	enterParamMethod?: (ctx: ParamMethodContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramMethod`.
	 * @param ctx the parse tree
	 */
	exitParamMethod?: (ctx: ParamMethodContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramName`.
	 * @param ctx the parse tree
	 */
	enterParamName?: (ctx: ParamNameContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramName`.
	 * @param ctx the parse tree
	 */
	exitParamName?: (ctx: ParamNameContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramValue`.
	 * @param ctx the parse tree
	 */
	enterParamValue?: (ctx: ParamValueContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramValue`.
	 * @param ctx the parse tree
	 */
	exitParamValue?: (ctx: ParamValueContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.path`.
	 * @param ctx the parse tree
	 */
	enterPath?: (ctx: PathContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.path`.
	 * @param ctx the parse tree
	 */
	exitPath?: (ctx: PathContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.query`.
	 * @param ctx the parse tree
	 */
	enterQuery?: (ctx: QueryContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.query`.
	 * @param ctx the parse tree
	 */
	exitQuery?: (ctx: QueryContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.queryParam`.
	 * @param ctx the parse tree
	 */
	enterQueryParam?: (ctx: QueryParamContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.queryParam`.
	 * @param ctx the parse tree
	 */
	exitQueryParam?: (ctx: QueryParamContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.queryParamName`.
	 * @param ctx the parse tree
	 */
	enterQueryParamName?: (ctx: QueryParamNameContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.queryParamName`.
	 * @param ctx the parse tree
	 */
	exitQueryParamName?: (ctx: QueryParamNameContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.queryParamValue`.
	 * @param ctx the parse tree
	 */
	enterQueryParamValue?: (ctx: QueryParamValueContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.queryParamValue`.
	 * @param ctx the parse tree
	 */
	exitQueryParamValue?: (ctx: QueryParamValueContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.frag`.
	 * @param ctx the parse tree
	 */
	enterFrag?: (ctx: FragContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.frag`.
	 * @param ctx the parse tree
	 */
	exitFrag?: (ctx: FragContext) => void;
}

