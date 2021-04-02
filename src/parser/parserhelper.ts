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

import { DIDURLBaseListener } from "./DIDURLBaseListener";
import { DIDURLLexer } from "./DIDURLLexer";
import { ANTLRErrorListener, CharStreams, CommonTokenStream } from "antlr4ts";
import { DIDURLParser } from "./DIDURLParser";
import { ParseTree } from "antlr4ts/tree/ParseTree";
import { IllegalArgumentException } from "../exceptions/exceptions";
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker'

export class ParserHelper {
	public static parse(didurl: string, didOnly: boolean, listener: DIDURLBaseListener) {
		let errorListener: ANTLRErrorListener<any> = {
			syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
				throw new IllegalArgumentException("At position " + charPositionInLine + ": " + msg, e);
			}
		}

		let input = CharStreams.fromString(didurl);
        let lexer = new DIDURLLexer(input);
        lexer.removeErrorListeners();
        lexer.addErrorListener(errorListener);

        let tokens = new CommonTokenStream(lexer);
        let parser = new DIDURLParser(tokens);
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

    	let tree: ParseTree;

    	if (didOnly)
    		tree = parser.did();
    	else
    		tree = parser.didurl();

    	let walker = new ParseTreeWalker();
    	walker.walk(listener, tree);
	}
}
