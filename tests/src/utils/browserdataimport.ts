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

import browserBundledData from "../../generated/browserdata.json";
import { File } from "@elastosfoundation/did-js-sdk";
import { runningInBrowser } from "./utils";

/**
 * Converts a bundle entry into a real folder or file in browserfs file system.
 */
async function importBundledBrowserDataToFS(rootFolderPath, folder): Promise<void> {
    const files = Object.keys(folder);
    for (const file of files) {
        if ("_content" in folder[file]) {
            // File
            let fullPath = rootFolderPath+"/"+file;
            //console.log("Writing to file ", fullPath);
            await new File(fullPath).writeText(folder[file]["_content"]);
        }
        else {
            // Folder
            let fullPath = rootFolderPath+"/"+file
            await new File(fullPath).createDirectory();
            await importBundledBrowserDataToFS(rootFolderPath+"/"+file, folder[file]);
        }
    }
}

var importBundledBrowserData;
var dataWasImported = false; // Remember if we imported the data during this session or not, to avoid browser tests to do the same thing many times.
if (runningInBrowser()) {
    importBundledBrowserData = async () => {
        // We have to really append those files into browser's file system for methods such as DIDStore.open()
        // work from the SDK. So we recursively import all entries
        if (!dataWasImported) {
            console.log("Importing bundled browser data to FS");
            await importBundledBrowserDataToFS("/testresources", browserBundledData);
            dataWasImported = true;
        }
    }
}
else {
    importBundledBrowserData = async () => Promise.resolve();
}

export {
    importBundledBrowserData
}