


export interface DIDValues {
    value: string;
    method: string;
    methodSpecificId: string;
}

export interface DIDURLValues{
    url: string;
    did: DIDValues;
    params: Map<string, string>;
    path: string;
    query: Map<string, string>;
    fragment: string;
}

export class DIDURLParser{

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


    private static extractDID(url: string): DIDValues{
        if (!url.startsWith("did")){
            return {
                value: "",
                method: "",
                methodSpecificId: ""
            };
        }

        let did = url;
        let match = url.match(/[?#\/;]/g)
        
        if (match && match.length > 0) {
            let indexOf = url.indexOf(match[0])
            did = did.substring(0, indexOf)
        }
        
        let didValues = did.split(":")

        
        return {
            value: did,
            method: didValues[1],
            methodSpecificId: didValues[2]
        }
    }

    private static extractParams(url: string): Map<string, string>{
        let startIn = url.indexOf(";")
        if (startIn < 0) return new Map<string, string>();

        let parameters = url.substring(startIn + 1)

        let match = parameters.match(/[?#\/]/g)
        if (match && match.length > 0) {
            parameters = parameters.substring(0, parameters.indexOf(match[0]))
        };

        let values = parameters.split(";")
        
        return this.generateMapValues(values)
    }

    private static extractPath(url: string): string{
        let startIn = url.indexOf("/")
        if (startIn < 0) return "";

        let path = url.substring(startIn)

        let match = path.match(/[?#]/g)
        if (match && match.length > 0) {
            path = path.substring(0, path.indexOf(match[0]))
        };
        
        return path
    }

    private static extractQuery(url: string): Map<string, string>{
        let startIn = url.indexOf("?")
        if (startIn < 0) return new Map<string, string>();

        let queryValues = url.substring(startIn + 1)

        let indexOf = queryValues.indexOf("#")
        if (indexOf >= 0) {
            queryValues = queryValues.substring(0, indexOf)
        };

        let values = queryValues.split("&")
        
        return this.generateMapValues(values)
    }

    private static generateMapValues(values: string[]): Map<string, string>{
        let response = new Map<string, string>(); 

        values.forEach(value => {
            let splitValue = value.split("=")
            if (splitValue.length === 1){
                response.set(splitValue[0], null)
            } else {
                response.set(splitValue[0], splitValue[1])
            }
        });

        return response
    }

    private static extractFragment(url: string): string{
       
        let indexOf = url.indexOf("#")
        if (indexOf < 0) return "";
        
        return url.substring(indexOf + 1)
    }

}