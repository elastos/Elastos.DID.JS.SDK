import { SerializationError } from "./exceptions/exceptions";
import { JSONObject } from "./json";

export interface Serializable<T> {
    new(): T;
    serialize(normalized: boolean): string;
    serializeToJSONObject(): JSONObject;
    static deserialize<T>(source: string, TargetClazz: new() => T): T;
    static deserializeFromJSONObject(source: JSONObject): T;
}

export class Serializer {

    public static serialize<T extends Serializable<?>>(source: T): string {
        return JSON.stringify(this.serializeToJSONObject(source));
    }

    public static deserialize<T extends Serializable<?>>(source: string, TargetClazz: new() => T): T {
        return new TargetClazz();
    }

    public static serializeToJSONObject<T extends Serializable<?>>(source: T): JSONObject {
        try {
            let jsonObj: JSONObject = {};
            Object.entries(source).forEach(
                ([prop, value]) => {
                    jsonObj[prop] = typeof value['serializeToJSONObject'] === 'function' ? 
                        value.serializeToJSONObject() : JSON.parse(JSON.stringify(value));
                }
            );
            return jsonObj;
        } catch (e) {
            throw new SerializationError("Unable to serialize '" + typeof source + "'.", e);
        }
    }

    protected static deserializeFromJSONObject<T extends Serializable<?>>(source: JSONObject, TargetClazz: new() => T): T {
        try {

            let newInstance = new TargetClazz();

            Object.entries(source).forEach(
                ([key, value]) => {
                    let newValue: typeof value = typeof value['deserializeFromJSONObject'] === 'function' ? 
                        (typeof value).deserializeFromJSONObject(source) : value;

                    let setterMethod = 'set' + this.properCase(key);
                    if (typeof newInstance[setterMethod] === 'function') {
                        newInstance[setterMethod](newValue);
                    } else {
                        newInstance[key] = newValue; 
                }
            );
            return newInstance;
        } catch (e) {
            throw new SerializationError(this.constructor.name + ": Serialization error", e);
        }
    }

    private static properCase(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
}

/*
export class BaseSerializable<C extends BaseSerializable> implements Serializable<BaseSerializable> {

    public serialize(normalized = true): string {
        return JSON.stringify(this.toJSONObject(normalized));
    }

    public static deserialize<T>(source: string, TargetClazz: new() => T): T;
        return new T();//this.fromJSONObject(JSON.parse(source));
    }

    public toString(normalized = true): string {
        return this.serialize(normalized);
    }

    protected toJSONObject(normalized = true): JSONObject {
        try {
            let jsonObj: JSONObject = {};
            Object.entries(this).forEach(
                ([key, value]) => {
                    let jsonPropObj: JSONObject;
                    if (value instanceof AbstractSerializable) {
                        jsonPropObj = value.toJSONObject(normalized);
                    } else {
                        jsonPropObj = JSON.parse(JSON.stringify(value));
                    }
                    jsonObj[key] = jsonPropObj;
                }
            );
            return jsonObj;
        } catch (e) {
            throw new IllegalArgumentException(this.constructor.name + ": Serialization error", e);
        }
    }

    protected static fromJSONObject<T extends typeof AbstractSerializable>(source: JSONObject, TargetClazz: T): Serializable {
        try {

            let newClass:new() => T;
            let newInstance = new TargetClazz();

            Object.entries(source).forEach(
                ([key, value]) => {
                    type propType = this["k"];
                    if (Object.keys(newInstance).includes(key)) {
                        if (newInstance[key] instanceof AbstractSerializable) {
                            JSON.parse(
                        }
                    }
                    if (value instanceof AbstractSerializable) {
                        jsonPropObj = value.toJSONObject(normalized);
                    } else {
                        jsonPropObj = JSON.parse(JSON.stringify(value));
                    }
                    jsonObj[key] = jsonPropObj;
                }
            );
            return jsonObj;
        } catch (e) {
            throw new IllegalArgumentException(this.constructor.name + ": Serialization error", e);
        }
    }

    protected hasOwnProperty<X extends {}, Y extends PropertyKey> (obj: X, prop: Y): obj is X & Record<Y, unknown> {
        return obj.hasOwnProperty(prop)
    }
}

function hasOwnProperty<X extends {}, Y extends PropertyKey>
  (obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop)
}
*/