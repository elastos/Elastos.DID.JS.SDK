import { DIDURLListener } from './DIDURLListener';
import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { ErrorNode } from "antlr4ts/tree/ErrorNode";
import { DidurlContext, 
    DidContext, 
    MethodContext, 
    MethodSpecificStringContext, 
    ParamsContext, 
    ParamContext, 
    ParamQNameContext, 
    ParamMethodContext, 
    ParamNameContext, 
    ParamValueContext, 
    PathContext, 
    QueryContext, 
    QueryParamContext, 
    QueryParamNameContext, 
    QueryParamValueContext, 
    FragContext } from './DIDURLParser';

export class DIDURLBaseListener implements DIDURLListener {
	public enterDidurl(ctx: DidurlContext): void { }
	public exitDidurl(ctx: DidurlContext): void { }
	public enterDid(ctx: DidContext): void { }
	public exitDid(ctx: DidContext): void { }
	public enterMethod(ctx: MethodContext): void { }
	public exitMethod(ctx: MethodContext): void { }
	public enterMethodSpecificString(ctx: MethodSpecificStringContext): void { }
	public exitMethodSpecificString(ctx: MethodSpecificStringContext): void { }
	public enterParams(ctx: ParamsContext): void { }
	public exitParams(ctx: ParamsContext): void { }
	public enterParam(ctx: ParamContext): void { }
	public exitParam(ctx: ParamContext): void { }
	public enterParamQName(ctx: ParamQNameContext): void { }
	public exitParamQName(ctx: ParamQNameContext): void { }
	public enterParamMethod(ctx: ParamMethodContext): void { }
	public exitParamMethod(ctx: ParamMethodContext): void { }
	public enterParamName(ctx: ParamNameContext): void { }
	public exitParamName(ctx: ParamNameContext): void { }
	public enterParamValue(ctx: ParamValueContext): void { }
	public exitParamValue(ctx: ParamValueContext): void { }
	public enterPath(ctx: PathContext): void { }
	public exitPath(ctx: PathContext): void { }
	public enterQuery(ctx: QueryContext): void { }
	public exitQuery(ctx: QueryContext): void { }
	public enterQueryParam(ctx: QueryParamContext): void { }
	public exitQueryParam(ctx: QueryParamContext): void { }
	public enterQueryParamName(ctx: QueryParamNameContext): void { }
	public exitQueryParamName(ctx: QueryParamNameContext): void { }
	public enterQueryParamValue(ctx: QueryParamValueContext): void { }
	public exitQueryParamValue(ctx: QueryParamValueContext): void { }
	public enterFrag(ctx: FragContext): void { }
	public exitFrag(ctx: FragContext): void { }
	public enterEveryRule(ctx: ParserRuleContext): void { }
	public exitEveryRule(ctx: ParserRuleContext): void { }
	public visitTerminal(node: TerminalNode): void { }
	public visitErrorNode(node: ErrorNode): void { }
}