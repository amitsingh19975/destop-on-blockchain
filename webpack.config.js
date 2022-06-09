const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const Dotenv = require('dotenv-webpack');
const {
    VueLoaderPlugin
} = require('vue-loader');
const fs = require('fs');

const GLOBAL_SCSS_PATH = './src/dfx_assets/src/scss_variables.scss';
const GLOBAL_SCSS = fs.readFileSync(GLOBAL_SCSS_PATH).toString();

function initCanisterEnv() {
    let localCanisters, prodCanisters;
    try {
        localCanisters = require(path.resolve(
            ".dfx",
            "local",
            "canister_ids.json"
        ));
    } catch (error) {
        console.log("No local canister_ids.json found. Continuing production");
    }
    try {
        prodCanisters = require(path.resolve("canister_ids.json"));
    } catch (error) {
        console.log("No production canister_ids.json found. Continuing with local");
    }

    const network =
        process.env.DFX_NETWORK ||
        (process.env.NODE_ENV === "production" ? "ic" : "local");

    const canisterConfig = network === "local" ? localCanisters : prodCanisters;

    return Object.entries(canisterConfig).reduce((prev, current) => {
        const [canisterName, canisterDetails] = current;
        prev[canisterName.toUpperCase() + "_CANISTER_ID"] =
            canisterDetails[network];
        return prev;
    }, {});
}

const canisterEnvVariables = initCanisterEnv();

const isDevelopment = process.env.NODE_ENV !== "production";

const frontendDirectory = "dfx_assets";

const workspace = path.join("src", frontendDirectory, "src");

const asset_entry = path.join(workspace, "index.html");

module.exports = {
    target: "web",
    mode: isDevelopment ? "development" : "production",
    entry: {
        // The frontend.entrypoint points to the HTML file for this build, so we need
        // to replace the extension to `.js`.
        index: path.join(__dirname, asset_entry).replace(/\.html$/, ".ts"),
    },
    devtool: isDevelopment ? "source-map" : false,
    optimization: {
        minimize: !isDevelopment,
        minimizer: [new TerserPlugin()],
    },
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx"],
        fallback: {
            assert: require.resolve("assert/"),
            buffer: require.resolve("buffer/"),
            events: require.resolve("events/"),
            stream: require.resolve("stream-browserify/"),
            util: require.resolve("util/"),
        },
        alias: {
            '@': __dirname,
        },
    },
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "dist", frontendDirectory),
    },

    // Depending in the language or framework you are using for
    // front-end development, add module loaders to the default
    // webpack configuration. For example, if you are using React
    // modules and CSS as described in the "Adding a stylesheet"
    // tutorial, uncomment the following lines:
    module: {
        rules: [{
            test: /.vue$/,
            use: 'vue-loader',
            exclude: /node_modules/,
        }, {
            test: /\.(ts|tsx|jsx)$/,
            loader: "ts-loader",
            exclude: /node_modules/,
            options: {
                appendTsSuffixTo: [/.vue$/],
            }
        },
        {
            test: /\.s?[ac]ss$/i,
            use: ['style-loader', 'css-loader', {
                loader: 'sass-loader',
                options: {
                    additionalData: (content, loaderContext) => {
                        if (/\.vue$/.test(loaderContext.resourcePath))
                            return `${GLOBAL_SCSS} \n ${content}`;
                        return content;
                    },
                }
            }],
        },
        {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource',
        },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, asset_entry),
            cache: false,
        }),
        new CopyPlugin({
            patterns: [{
                from: path.join(__dirname, "src", frontendDirectory, "assets"),
                to: path.join(__dirname, "dist", frontendDirectory),
            },],
        }),
        new webpack.EnvironmentPlugin({
            NODE_ENV: "development",
            ...canisterEnvVariables,
        }),
        new webpack.ProvidePlugin({
            Buffer: [require.resolve("buffer/"), "Buffer"],
            process: require.resolve("process/browser"),
        }),
        new VueLoaderPlugin(),
        new Dotenv({
            path: path.join(__dirname, '.env'),
            systemvars: true,
        }),
        new webpack.DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: isDevelopment,
        }),

    ],
    // proxy /api to port 8000 during development
    devServer: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
                pathRewrite: {
                    "^/api": "/api",
                },
            },
        },
        hot: true,
        watchFiles: [path.resolve(__dirname, "src", frontendDirectory)],
        liveReload: true,
        historyApiFallback: true,
    },
};
