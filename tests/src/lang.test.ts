import internal from "stream";

async function bar(): Promise<string> {
    console.log("bar...");

    for (let i = 0; i < 100; i++) {
        console.log(".");
    }

    return "FooBar";
}

function foo(): void {
    console.log("foo...");

    bar().then((s)=>{console.log(s);});

    console.log("----------");
}



describe('TypeScript Tests', () => {
    test('Test Constructor', () => {
        foo();
    });
});