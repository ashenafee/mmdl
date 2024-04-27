import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import tailwindConfig from "./tailwind.config.js";
import {
    chromeExtension,
    simpleReloader,
} from "rollup-plugin-chrome-extension";

// const tailwindConfig = require('./tailwind.config.js');

export default {
    input: "src/manifest.json",
    output: {
        dir: "dist",
        format: "esm",
    },
    plugins: [
        // always put chromeExtension() before other plugins
        chromeExtension(),
        simpleReloader(),
        postcss({
            extensions: ['.css', '.module.css'],
            plugins: [autoprefixer(), tailwindcss(tailwindConfig)]
        }),
        resolve(),
        commonjs()
    ],
};
