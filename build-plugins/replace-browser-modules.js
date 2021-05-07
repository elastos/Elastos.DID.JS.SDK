import path from 'path';

const ID_CRYPTO = path.resolve('src/utils/crypto'); // full path to the local file that calls nodejs
const ID_FS = path.resolve('src/utils/fs');
const ID_PATH = path.resolve('src/utils/path');

export default function replaceBrowserModules() {
	return {
		name: 'replace-browser-modules',
		resolveId: (source, importee) => {
            //console.log("resolveId", source, importee)
			if (importee && source[0] === '.') {
				const resolved = path.join(path.dirname(importee), source);
				switch (resolved) {
					case ID_CRYPTO:
                        console.log("Replacing ["+source+"]: ")
						return path.resolve('browser/crypto.ts'); // full path to the browser stub
					case ID_FS:
						return path.resolve('browser/fs.ts');
					case ID_PATH:
						return path.resolve('browser/path.ts');
				}
			}
		}
	};
}