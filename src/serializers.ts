import { DIDEntity } from "./internals";
import type { Class } from "./class";
import { IllegalArgumentException, UnsupportedOperationException } from "./exceptions/exceptions";
import type { DID } from "./internals";
import { Constants } from "./constants";
import type {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import type {
    ObjectMapper,
} from "@elastosfoundation/jackson-js";
import { stringify } from "querystring";
import { InformationEvent } from "http";

export class Serializer {
    public static context(context: JsonStringifierTransformerContext): DIDEntity.SerializeContext {
        return context.attributes[DIDEntity.CONTEXT_KEY];
    }

    public static mapper(context: JsonStringifierTransformerContext): ObjectMapper {
        return Serializer.context(context).getObjectMapper();
    }

    public static serialize (value: any, context: JsonStringifierTransformerContext): any {
        return value;
    }
}

export class Deserializer {
    public static mapper(context: JsonParserTransformerContext): ObjectMapper {
        return DIDEntity.getDefaultObjectMapper();
    }

    public static deserialize(value: string, context: JsonParserTransformerContext): any {
        return Deserializer.mapper(context).parse(value);
    }
}

// This filter is shared by all publickey related objects
export function keyTypeFilter(value: any, context?: JsonStringifierTransformerContext): boolean {
    let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

    if (!serializeContext || serializeContext.isNormalized())
        return false;

    return value ? value === Constants.DEFAULT_PUBLICKEY_TYPE : false;
}





export enum FieldType {
    LITERAL, NUMBER, BUFFER, METHOD, TYPE
}
export class FieldInfo {
    private serializerMethod: any = null;
    private deserializerMethod: any = null;
    private typeName: string = null;
    private fieldType: FieldType;
    
    private constructor(fieldType: FieldType) {
        this.fieldType = fieldType;
    }

    public static forType(fieldType: FieldType): FieldInfo {
        if (!fieldType) {
            throw new IllegalArgumentException("fieldType is mandatory");
        }
        return new FieldInfo(fieldType);
    }

    public withTypeName(typeName: string): FieldInfo {
        this.typeName = typeName;
        return this;
    }
    public getTypeName(): string {
        return this.typeName;
    }
    public withSerializerMethod(method: (value: any, instance: any) => string): FieldInfo {
        this.serializerMethod = method;
        return this;
    }
    public getSerializerMethod(): (value: any, instance: any) => string {
        return this.serializerMethod;
    }
    public withDeserializerMethod(method: (value: string, jsonObj: any) => any): FieldInfo {
        this.deserializerMethod = method;
        return this;
    }
    public getDeserializerMethod(): (value: string, jsonObj: any) => any {
        return this.deserializerMethod;
    }
    public getFieldType(): FieldType {
        return this.fieldType;
    }
}

/**
 * 
 * Signature needed in serializable classes:
 * 
 *  - To get all serializable values:   public getAllValues(): Map<string, any>
 *  - To create from all values:        public static createFromValues<T extends DIDEntity<T>>(fieldValues: Map<string, any>): T
 *  - To serialize an instance:         public serialize(normalized: boolean)
 *  - To deserialize an instance:       public static deserialize<T extends DIDEntity<T>>(json: string): T;
 *  - Custom serializer method:         public static methodName<T extends DIDEntity<T>>(valueToSerialize: any, sourceInstance: T);
 *  - Custom deserializer method:       public static methodName<T extends DIDEntity<T>>(valueToDeserialize: any, sourceJson: JSONObject);
 * */

export class GenericSerializer {
    public static serialize<T extends DIDEntity<T>>(normalized: boolean, sourceInstance: T, fieldsMap: Map<string, FieldInfo>): string {

        if (!fieldsMap) {
            throw new IllegalArgumentException("fieldsMaps is mandatory in serialization");
        }

        if (!sourceInstance) {
            throw new IllegalArgumentException("fieldsMaps is mandatory in serialization");
        }

        if (fieldsMap.size < 1) {
            return "";
        }

        if (!(typeof sourceInstance['getAllValues'] === 'function')) {
            throw new UnsupportedOperationException("Serialization requires a 'getAllValues' method in source type.");
        }

        let sourceValues: Map<string, any> = sourceInstance.getAllValues();
        let jsonObj = {};

        fieldsMap.forEach((info, name, map) => {
            if (sourceValues.has(name)) {
                let serializedValue: string;
                switch(info.getFieldType() as FieldType) {
                    case FieldType.LITERAL:
                        serializedValue = sourceValues[name];
                        break;
                    case FieldType.NUMBER:
                        serializedValue = String(sourceValues[name]);
                        break;
                    case FieldType.BUFFER:
                        serializedValue = sourceValues[name].toString();
                        break;
                    case FieldType.METHOD:
                        if (!info.getSerializerMethod()) {
                            throw new IllegalArgumentException("No serialization method specified for field '" + name + "'");
                        }
                        serializedValue = info.getSerializerMethod()(sourceValues[name], sourceInstance);
                        break;
                    case FieldType.TYPE:
                        if (!(typeof sourceValues[name]['serialize'] === 'function')) {
                            throw new UnsupportedOperationException("Serialization requires a 'serialize' method in source type.");
                        }
                        serializedValue = sourceValues[name].serialize(normalized);
                        break;
                    default:
                        throw new UnsupportedOperationException(info.getFieldType() + " is not a supported type.");
                }
                jsonObj[name] = serializedValue;
            }
        });

        return JSON.stringify(jsonObj);
    }
    public static deserialize<T extends DIDEntity<T>>(normalized: boolean, jsonValue: string, targetClass: Class<T>, fieldsMap: Map<string, FieldInfo>): T {

        if (!fieldsMap) {
            throw new IllegalArgumentException("fieldsMaps is mandatory in deserialization");
        }
        if (!jsonValue) {
            throw new IllegalArgumentException("jsonValue is mandatory in deserialization");
        }
        if (!(typeof targetClass['createFromValues'] === 'function')) {
            throw new UnsupportedOperationException("Deserialization requires a 'createFromValues' method in target type.");
        }

        let sourceJson = JSON.parse(jsonValue);
        let targetValues = new Map<string, any>();

        fieldsMap.forEach((info, name, map) => {
            if (sourceJson.has(name)) {
                let deserializedValue: any;
                switch(info.getFieldType() as FieldType) {
                    case FieldType.LITERAL:
                        deserializedValue = sourceJson[name];
                        break;
                    case FieldType.NUMBER:
                        deserializedValue = parseInt(sourceJson[name]);
                        break;
                    case FieldType.BUFFER:
                        deserializedValue = Buffer.from(sourceJson[name], 'utf-8');
                        break;
                    case FieldType.METHOD:
                        if (!info.getDeserializerMethod()) {
                            throw new IllegalArgumentException("No deserialization method specified for field '" + name + "'");
                        }
                        deserializedValue = info.getDeserializerMethod()(JSON.stringify(sourceJson[name]), sourceJson);
                        break;
                    case FieldType.TYPE:
                        if (!info.getTypeName()) {
                            throw new IllegalArgumentException("No deserialization type specified for field '" + name + "'");
                        }
                        deserializedValue = info.getTypeName()['deserialize'](JSON.stringify(sourceJson[name]));
                        break;
                    default:
                        throw new UnsupportedOperationException(info.getFieldType() + " is not a supported type.");
                }
                targetValues[name] = deserializedValue;
            }
        });
        return targetClass['createFromValues'](targetValues);
    }
}