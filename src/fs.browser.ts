import BrowserFS, { BFSRequire } from "browserfs";
const fs = BFSRequire("fs");
const {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmdirSync,
    statSync,
    lstatSync,
    writeFileSync,
    unlinkSync
} = fs;

BrowserFS.configure({
    fs: "LocalStorage",
    options: {}
}, function(e) {
    if (e) {
        throw e;
    }
    else {
        //console.log("BrowserFS initialization complete");
    }
});

export {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmdirSync,
    statSync,
    lstatSync,
    writeFileSync,
    unlinkSync
};