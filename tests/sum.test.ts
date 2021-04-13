function sum(a, b) {
    return a + b;
}

import { DIDStore } from "../src/didstore";

test('adds 1 + 2 to equal 3', () => {
    let store = DIDStore.open("test");

    expect(sum(1, 2)).toBe(3);
    expect(sum(1, 3)).toBe(5);
});