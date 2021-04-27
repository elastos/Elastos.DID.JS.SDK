// Generated from src/parser/DIDURL.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
import { DIDURLParser } from "./DIDURLParser";

/**
 * This interface defines a complete listener for a parse tree produced by
 * `DIDURLParser`.
 */
export interface DIDURLListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `DIDURLParser.didurl`.
	 * @param ctx the parse tree
	 */
	enterDidurl?: (ctx: DIDURLParser.DidurlContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.didurl`.
	 * @param ctx the parse tree
	 */
	exitDidurl?: (ctx: DIDURLParser.DidurlContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.did`.
	 * @param ctx the parse tree
	 */
	enterDid?: (ctx: DIDURLParser.DidContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.did`.
	 * @param ctx the parse tree
	 */
	exitDid?: (ctx: DIDURLParser.DidContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.method`.
	 * @param ctx the parse tree
	 */
	enterMethod?: (ctx: DIDURLParser.MethodContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.method`.
	 * @param ctx the parse tree
	 */
	exitMethod?: (ctx: DIDURLParser.MethodContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.methodSpecificString`.
	 * @param ctx the parse tree
	 */
	enterMethodSpecificString?: (ctx: DIDURLParser.MethodSpecificStringContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.methodSpecificString`.
	 * @param ctx the parse tree
	 */
	exitMethodSpecificString?: (ctx: DIDURLParser.MethodSpecificStringContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.params`.
	 * @param ctx the parse tree
	 */
	enterParams?: (ctx: DIDURLParser.ParamsContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.params`.
	 * @param ctx the parse tree
	 */
	exitParams?: (ctx: DIDURLParser.ParamsContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.param`.
	 * @param ctx the parse tree
	 */
	enterParam?: (ctx: DIDURLParser.ParamContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.param`.
	 * @param ctx the parse tree
	 */
	exitParam?: (ctx: DIDURLParser.ParamContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramQName`.
	 * @param ctx the parse tree
	 */
	enterParamQName?: (ctx: DIDURLParser.ParamQNameContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramQName`.
	 * @param ctx the parse tree
	 */
	exitParamQName?: (ctx: DIDURLParser.ParamQNameContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramMethod`.
	 * @param ctx the parse tree
	 */
	enterParamMethod?: (ctx: DIDURLParser.ParamMethodContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramMethod`.
	 * @param ctx the parse tree
	 */
	exitParamMethod?: (ctx: DIDURLParser.ParamMethodContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramName`.
	 * @param ctx the parse tree
	 */
	enterParamName?: (ctx: DIDURLParser.ParamNameContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramName`.
	 * @param ctx the parse tree
	 */
	exitParamName?: (ctx: DIDURLParser.ParamNameContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.paramValue`.
	 * @param ctx the parse tree
	 */
	enterParamValue?: (ctx: DIDURLParser.ParamValueContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.paramValue`.
	 * @param ctx the parse tree
	 */
	exitParamValue?: (ctx: DIDURLParser.ParamValueContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.path`.
	 * @param ctx the parse tree
	 */
	enterPath?: (ctx: DIDURLParser.PathContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.path`.
	 * @param ctx the parse tree
	 */
	exitPath?: (ctx: DIDURLParser.PathContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.query`.
	 * @param ctx the parse tree
	 */
	enterQuery?: (ctx: DIDURLParser.QueryContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.query`.
	 * @param ctx the parse tree
	 */
	exitQuery?: (ctx: DIDURLParser.QueryContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.queryParam`.
	 * @param ctx the parse tree
	 */
	enterQueryParam?: (ctx: DIDURLParser.QueryParamContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.queryParam`.
	 * @param ctx the parse tree
	 */
	exitQueryParam?: (ctx: DIDURLParser.QueryParamContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.queryParamName`.
	 * @param ctx the parse tree
	 */
	enterQueryParamName?: (ctx: DIDURLParser.QueryParamNameContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.queryParamName`.
	 * @param ctx the parse tree
	 */
	exitQueryParamName?: (ctx: DIDURLParser.QueryParamNameContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.queryParamValue`.
	 * @param ctx the parse tree
	 */
	enterQueryParamValue?: (ctx: DIDURLParser.QueryParamValueContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.queryParamValue`.
	 * @param ctx the parse tree
	 */
	exitQueryParamValue?: (ctx: DIDURLParser.QueryParamValueContext) => void;

	/**
	 * Enter a parse tree produced by `DIDURLParser.frag`.
	 * @param ctx the parse tree
	 */
	enterFrag?: (ctx: DIDURLParser.FragContext) => void;
	/**
	 * Exit a parse tree produced by `DIDURLParser.frag`.
	 * @param ctx the parse tree
	 */
	exitFrag?: (ctx: DIDURLParser.FragContext) => void;
}

