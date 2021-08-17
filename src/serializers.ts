import type { Class } from "./class";
import { IllegalArgumentException, UnsupportedOperationException } from "./exceptions/exceptions";
import { Constants } from "./constants";
import { DateSerializer } from "./dateserializer";

// This filter is shared by all publickey related objects
export class FilteredTypeSerializer {
    public static serialize(normalized: boolean, value: string, instance: any): string {
        if (!normalized && value) {
            return String(value === Constants.DEFAULT_PUBLICKEY_TYPE);
        }
        return null;
    }

    public static deserialize(value: string, fullJsonObj: any): string {
        return value;
    }
}

export enum FieldType {
    LITERAL, NUMBER, BUFFER, DATE, METHOD, TYPE
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
    public withSerializerMethod(method: (normalized: boolean, value: any, instance: any) => string): FieldInfo {
        this.serializerMethod = method;
        return this;
    }
    public getSerializerMethod(): (normalized: boolean, value: any, instance: any) => string {
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
 *  - To create from all values:        public static createFromValues(fieldValues: Map<string, any>): any
 *  - To serialize an instance:         public serialize(normalized: boolean)
 *  - To deserialize an instance:       public static deserialize(json: string): any;
 *  - Custom serializer method:         public static methodName(normalized: boolean, valueToSerialize: any, sourceInstance: any);
 *  - Custom deserializer method:       public static methodName(valueToDeserialize: any, sourceJson: any);
 * */

export class GenericSerializer {
    public static serialize(normalized: boolean, sourceInstance: any, fieldsMap: Map<string, FieldInfo>): string {
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
            if (sourceValues.has(name) && sourceValues[name] && sourceValues[name] != null) {
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
                    case FieldType.DATE:
                        serializedValue = DateSerializer.serialize(normalized, sourceValues[name], sourceInstance);
                        break;
                    case FieldType.METHOD:
                        if (!info.getSerializerMethod()) {
                            throw new IllegalArgumentException("No serialization method specified for field '" + name + "'");
                        }
                        serializedValue = info.getSerializerMethod()(normalized, sourceValues[name], sourceInstance);
                        break;
                    case FieldType.TYPE:
                        if (sourceValues[name] instanceof Array) {
                            serializedValue = sourceValues[name].map((v) => {
                                let valueType = typeof v;
                                if (info.getTypeName() != valueType) {
                                    throw new IllegalArgumentException("Expected '" + info.getTypeName() + "' but got '" + valueType + "'");
                                }
                                if (!(typeof v['serialize'] === 'function')) {
                                    throw new UnsupportedOperationException("Serialization requires a 'serialize' method in source type.");
                                }
                                return v.serialize(normalized);
                            });
                        } else {
                            let valueType = typeof (sourceValues[name]);
                            if (info.getTypeName() != valueType) {
                                throw new IllegalArgumentException("Expected '" + info.getTypeName() + "' but got '" + valueType + "'");
                            }
                            if (!(typeof sourceValues[name]['serialize'] === 'function')) {
                                throw new UnsupportedOperationException("Serialization requires a 'serialize' method in source type.");
                            }
                            serializedValue = sourceValues[name].serialize(normalized);
                        }
                        break;
                    default:
                        throw new UnsupportedOperationException(info.getFieldType() + " is not a supported type.");
                }
                jsonObj[name] = serializedValue;
            }
        });

        return JSON.stringify(jsonObj);
    }

    public static removeNull(jsonObj: any): any {
        Object.entries(jsonObj).forEach(([key, value]) => {
            if (!value || value == null) {
                delete jsonObj[key];
            }
        });
        return jsonObj;
    }

    public static deserialize<T>(jsonValue: string, targetClass: Class<T>, fieldsMap: Map<string, FieldInfo>): T {
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
                    case FieldType.DATE:
                        deserializedValue = DateSerializer.deserialize(sourceJson[name], sourceJson);
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
                        if (sourceJson[name] instanceof Array) {
                            deserializedValue = sourceJson[name].map((v) => {
                                return info.getTypeName()['deserialize'](JSON.stringify(v));
                            });
                        } else {
                            deserializedValue = info.getTypeName()['deserialize'](JSON.stringify(sourceJson[name]));
                        }
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