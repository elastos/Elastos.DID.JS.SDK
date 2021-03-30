export abstract class JSONObject {
    public serialize () {
        return JSON.stringify(this);
    }
}