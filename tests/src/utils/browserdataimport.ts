import browserBundledData from "../../generated/browserdata.json";
import { File } from "@elastosfoundation/did-js-sdk";
import { runningInBrowser } from "@elastosfoundation/did-js-sdk";

/**
 * Converts a bundle entry into a real folder or file in browserfs file system.
 */
function importBundledBrowserDataToFS(rootFolderPath, folder) {
    Object.keys(folder).forEach((file: string)=>{
        if ("_content" in folder[file]) {
            // File
            let fullPath = rootFolderPath+"/"+file;
            //console.log("Writing to file ", fullPath);
            new File(fullPath).writeText(folder[file]["_content"]);
        }
        else {
            // Folder
            let fullPath = rootFolderPath+"/"+file
            new File(fullPath).createDirectory();
            importBundledBrowserDataToFS(rootFolderPath+"/"+file, folder[file]);
        }
    });
}

var importBundledBrowserData;
var dataWasImported = false; // Remember if we imported the data during this session or not, to avoid browser tests to do the same thing many times.
if (runningInBrowser()) {
    importBundledBrowserData = () => {
        // We have to really append those files into browser's file system for methods such as DIDStore.open()
        // work from the SDK. So we recursively import all entries
        if (!dataWasImported) {
            console.log("Importing bundled browser data to FS");
            importBundledBrowserDataToFS("/testresources", browserBundledData);
            dataWasImported = true;
        }
    }
}
else {
    importBundledBrowserData = () => {}
}

export {
    importBundledBrowserData
}