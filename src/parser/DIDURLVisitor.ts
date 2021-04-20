// Generated from src/parser/DIDURL.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";
import { DIDURLParser } from "./DIDURLParser";

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
	visitDidurl?: (ctx: DIDURLParser.DidurlContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.did`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDid?: (ctx: DIDURLParser.DidContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.method`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethod?: (ctx: DIDURLParser.MethodContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.methodSpecificString`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodSpecificString?: (ctx: DIDURLParser.MethodSpecificStringContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.params`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParams?: (ctx: DIDURLParser.ParamsContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.param`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParam?: (ctx: DIDURLParser.ParamContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramQName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamQName?: (ctx: DIDURLParser.ParamQNameContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramMethod`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamMethod?: (ctx: DIDURLParser.ParamMethodContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamName?: (ctx: DIDURLParser.ParamNameContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.paramValue`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamValue?: (ctx: DIDURLParser.ParamValueContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.path`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPath?: (ctx: DIDURLParser.PathContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: DIDURLParser.QueryContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.queryParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryParam?: (ctx: DIDURLParser.QueryParamContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.queryParamName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryParamName?: (ctx: DIDURLParser.QueryParamNameContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.queryParamValue`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryParamValue?: (ctx: DIDURLParser.QueryParamValueContext) => Result;

	/**
	 * Visit a parse tree produced by `DIDURLParser.frag`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFrag?: (ctx: DIDURLParser.FragContext) => Result;
}

