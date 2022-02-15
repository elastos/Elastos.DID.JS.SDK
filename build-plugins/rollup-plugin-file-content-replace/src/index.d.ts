export default function fileContentReplace(options: ReplaceOptions): Plugin;

export interface ReplaceOptions {
    fileReplacements?: FileReplacement[];
    root: string;
}

export interface FileReplacement {
    replace: string;
    with: string;
}
