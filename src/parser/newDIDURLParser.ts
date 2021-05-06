import { DIDURL } from "..";

export interface DIDURLValues{
    url: string;
    did: string;
    params: Map<string, string>;
    path: string;
    query: Map<string, string>;
    fragment: string;
}

export class NewDIDURLParser{

    public static NewFromURL(url: string): DIDURLValues{
        
        return {
            url,
            did: this.extractDID(url),
            params: this.extractParams(url),
            path: this.extractPath(url),
            query: this.extractQuery(url),
            fragment: this.extractFragment(url)
        }
    }


    private static extractDID(url: string): string{
        if (!url.startsWith("did")){
            return "";
        }

        let match = url.match(/[?#\/;]/g)
        if (match.length == 0) return url;
        
        let indexOf = url.indexOf(match[0])
        return url.substring(0,indexOf)
    }

    private static extractParams(url: string): Map<string, string>{
        let startIn = url.indexOf(";")
        if (startIn < 0) return new Map<string, string>();

        let parameters = url.substring(startIn + 1)

        let match = parameters.match(/[?#\/]/g)
        if (match.length > 0) {
            parameters = parameters.substring(0, parameters.indexOf(match[0]))
        };

        let values = parameters.split(";")
        
        return this.generateMapValues(values)
    }

    private static extractPath(url: string): string{
        let startIn = url.indexOf("/")
        if (startIn < 0) return "";

        let path = url.substring(startIn)

        let matchIndex = path.match(/[?#]/g)
        if (matchIndex.length > 0) {
            path = path.substring(0, path.indexOf(matchIndex[0]))
        };
        
        return path
    }

    private static extractQuery(url: string): Map<string, string>{
        let startIn = url.indexOf("?")
        if (startIn < 0) return new Map<string, string>();

        let queryValues = url.substring(startIn + 1)

        let matchIndex = queryValues.indexOf("#")
        if (matchIndex >= 0) {
            queryValues = queryValues.substring(0, matchIndex)
        };

        let values = queryValues.split("&")
        
        return this.generateMapValues(values)
    }

    private static generateMapValues(values: string[]): Map<string, string>{
        let response = new Map<string, string>(); 

        values.forEach(value => {
            let splitValue = value.split("=")
            if (splitValue.length === 1){
                response.set(splitValue[0], "")
            } else {
                response.set(splitValue[0], splitValue[1])
            }
        });

        return response
    }

    private static extractFragment(url: string): string{
       
        let indexOf = url.indexOf("#")
        if (indexOf < 0) return "";
        
        return url.substring(indexOf)
    }

}