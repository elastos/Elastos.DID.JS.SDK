"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fileContentReplace;

var _path = require("path");

var _promises = require("fs/promises");

//const path = require("path");
//const fs = require("fs/promises");
function fileContentReplace(options = {
  fileReplacements: [],
  root: ''
}) {
  const normalizeFileNameToModuleName = filename => {
    return filename.split('.').slice(0, -1).join('.');
  };

  const getReplacementObject = (targetReplaceImport = '', fileReplacements = []) => {
    const targetImportModule = targetReplaceImport.split('/').splice(1).join('/');
    return fileReplacements.find(replacement => {
      return targetImportModule === normalizeFileNameToModuleName(replacement.replace);
    });
  };

  const validateReplacementFiles = async (fileReplacements = [], pluginContext) => {
    fileReplacements.forEach(async replacement => {
      try {
        await (0, _promises.access)((0, _path.resolve)(options.root, replacement.with));
      } catch (e) {
        pluginContext.error('Could not find file: ' + replacement.with);
      }
    });
  };

  return {
    name: 'file-content-replace',

    buildStart() {
      try {
        return validateReplacementFiles(options.fileReplacements, this);
      } catch (e) {
        return Promise.reject();
      }
    },

    load(id) {// console.log('identification ', id);
    },

    resolveId(importee, importer) {
      // console.log('importee ', importee);
      // console.log('importer ', importer);
      // if ( /\0/.test( importee ) ) return null; // ignore IDs with null character, these belong to other plugins
      //
      // disregard entry module, unneeded but this makes the check explicit instead of implicit
      if (!importer) return null; // If this is an import relative to the parent dir of importer

      if (importee[0] === '.') {
        const replacementObject = getReplacementObject(importee, options.fileReplacements);

        if (replacementObject) {
          console.log((0, _path.relative)(options.root, importer) + ": replace", replacementObject.replace, "with", replacementObject.with);
          return (0, _path.resolve)(importer, '..', replacementObject.with);
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

  };
}