"use strict";

const gulp = require("gulp");
const babel = require('gulp-babel');
const rollup = require('gulp-rollup-stream');
const userscript = require("userscript-meta");
const fs = require("fs");
const path = require("path");
const ws = require('ws');
const yargs = require('yargs');
const clipboard = require('copy-paste');

const global_meta = (function () {
    try {
        return JSON.parse(fs.readFileSync("./global_meta.json").toString()) || {};
    } catch (e) {}
    return {};
})();

function buildApp(appName, isDev=false, noMeta=false) {
    let res = gulp.src(`./src/${appName}/main.js`)
        .pipe(rollup({
            format: "iife"
        }))
        .on("data", function (chunk) {
            let regex = /\/\/.*userscript.*\/userscript.*?\n/is;

            if (!noMeta) {
                let meta = global_meta;
                let buf = chunk.contents.toString().match(regex);
                if (buf) {
                    Object.assign(meta, userscript.parse(buf[0]));
                }

                try {
                    let file = fs.readFileSync(path.dirname(chunk.path) + path.sep + "meta.json");
                    Object.assign(meta, JSON.parse(file));
                } catch (e) {}

                chunk.userScript = meta;
            }

            chunk.contents = Buffer(chunk.contents.toString().replace(regex, ""));
        })
        .pipe(babel({
            presets: ['es2016']
        }));

    if (!isDev) {
        res.pipe(babel({
            "plugins": [
                "transform-minify-booleans",
                "minify-builtins",
                "transform-inline-consecutive-adds",
                "minify-dead-code-elimination",
                "minify-constant-folding",
                "minify-flip-comparisons",
                "minify-guarded-expressions",
                "minify-infinity",
                // "minify-mangle-names",
                "transform-member-expression-literals",
                "transform-merge-sibling-variables",
                "minify-numeric-literals",
                "transform-property-literals",
                "transform-regexp-constructors",
                "transform-remove-undefined",
                "minify-replace",
                // "minify-simplify",
                "transform-simplify-comparison-operators",
                "minify-type-constructors",
                "transform-undefined-to-void",
                "transform-remove-console",
                "transform-remove-debugger"
            ]
        }));
    }

    res.on("data", function (chunk) {
        if (!noMeta) {
            if (isDev) {
                chunk.userScript.name += ":dev";
            }
            chunk.contents = Buffer.concat([Buffer(userscript.stringify(chunk.userScript)), chunk.contents]);
        }
    });
    return res;
}

gulp.task("default", ["build"]);
gulp.task("build", function () {
    buildApp("**").pipe(gulp.dest("./build"));
});

gulp.task("dev", function () {
    let devScript = require("./devScript");

    let appName = yargs.argv.app;
    let isAutoReload = !!yargs.argv.autoreload;
    if (!appName || !fs.existsSync(`./src/${appName}`)) {
        return;
    }

    let wss = new ws.Server({
        port: 8080
    });

    buildApp(appName, true).on("data", function (chunk) {
        let str = userscript.stringify(chunk.userScript);
        str += devScript;
        clipboard.copy(str);
        console.log("Dev script was copied in clipboard!");
    });

    gulp.watch(`./src/${appName}/**/*.*`, function (arg) {
        switch (arg.type) {
            case "changed":
                let path = arg.path;
                buildApp(this.appName, true, true).on("data", function (chunk) {
                    for(let item of this.clients) {
                        item.send(JSON.stringify({
                            "autoreload": isAutoReload,
                            "script": chunk.contents.toString()
                        }));
                    }
                }.bind(this.wss));
                break;
        }
    }.bind({"appName": appName, "wss": wss}));

    wss.on("connection", function (wss) {
        buildApp(this, true, true).on("data", function (chunk) {
            wss.send(JSON.stringify({
                "autoreload": false,
                "script": chunk.contents.toString()
            }));
        }.bind(wss));
    }.bind(appName));
});
