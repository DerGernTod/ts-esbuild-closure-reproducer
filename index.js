const { build } = require("esbuild");
const { rmSync } = require("fs");
const { compiler } = require("google-closure-compiler");
const path = require("path");
const config = {
    "entryPoints": [
        "dist/ts/filea.js",
        "dist/ts/fileb.js",
        "dist/ts/filecommon.js"
    ],
    "bundle": true,
    "metafile": true,
    "outdir": "dist/esbuild",
    "sourcemap": true,
    "target": "es2017",
    "format": "esm",
    "splitting": true,
    "logLevel": "error"
};

rmSync(path.resolve(process.cwd(), "dist", "esbuild"), { recursive: true, force: true });
rmSync(path.resolve(process.cwd(), "dist", "closure"), { recursive: true, force: true });

build(config)
    .then(result => {
        const files = Object.keys(result.metafile.outputs);

        files.sort((a, b) => a.includes("chunk") || a.includes("common") ? -1 : 0);

        const closureChunks = files
        .filter(file => file.endsWith(".js"))
        .reduce((acc, file) => {
            let name = path.basename(file).split(".")[0];
            let fileCount = 1;
            let dependencies = ":common";
            if (file.includes("common") || file.includes("chunk")) {
                name = "common";
                fileCount = 2;
                dependencies = "";
            }
            let bundle = acc[name];
            if (!bundle) {
                bundle = [];
                bundle.push("--chunk", `${name}:${fileCount}${dependencies}`);
                bundle.push("--chunk_wrapper", `${name}:(function(){%s})()`);
            }
            bundle.push(
                "--source_map_input", `${file}|${file}.map`,
                "--js", file);
            acc[name] = bundle;
            return acc;
        }, {});
        const closureConfig = [
            ...Object.values(closureChunks).flat(),
            "--language_in", "ECMASCRIPT_2017",
            "--language_out", "ECMASCRIPT_2017",
            "--chunk_output_path_prefix", "./dist/closure/",
            "--rename_prefix_namespace", "myNamespace",
            "--assume_function_wrapper",
            "--compilation_level", "ADVANCED_OPTIMIZATIONS",
            "--create_source_map", "%outname%.map",
        ];
        const comp = new compiler(closureConfig);
        comp.run((code, out, err) => {
            console.log("done", code, out, err);
        });
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });