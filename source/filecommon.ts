function fileCommonFunction() {
    exportedFunction();
}

export function exportedFunction() {
    console.log("i'm exported");
}

fileCommonFunction();