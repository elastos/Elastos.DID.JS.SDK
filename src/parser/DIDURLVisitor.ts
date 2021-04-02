// Generated from src/parser/DIDURL.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";

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
 * This interface defines a complete generic visitor for a parse tree produced
 * by `DIDURLParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export interface DIDURLVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `DIDURLParser.didurl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDidurl?: (ctx: DidurlContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.did`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDid?: (ctx: DidContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.method`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethod?: (ctx: MethodContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.methodSpecificString`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodSpecificString?: (ctx: MethodSpecificStringContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.params`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParams?: (ctx: ParamsContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.param`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParam?: (ctx: ParamContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramQName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamQName?: (ctx: ParamQNameContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramMethod`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamMethod?: (ctx: ParamMethodContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamName?: (ctx: ParamNameContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramValue`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamValue?: (ctx: ParamValueContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.path`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPath?: (ctx: PathContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: QueryContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.queryParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryParam?: (ctx: QueryParamContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.queryParamName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryParamName?: (ctx: QueryParamNameContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.queryParamValue`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryParamValue?: (ctx: QueryParamValueContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.frag`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFrag?: (ctx: FragContext) => Result;
}

