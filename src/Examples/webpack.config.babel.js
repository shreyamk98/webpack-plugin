import dotenv from "dotenv";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import KombaiPlugin from "../../dist/src/webpack";
import webpack from "webpack";

const __dirname = path.dirname(__filename);

const env = dotenv.config().parsed;

const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

export default {
  mode: "development",
  entry: "./src/Examples/index.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "."),
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.jsx|\.tsx$/i,
        use: {
          loader: KombaiPlugin.loader,
          options: {
            // tsConfigPath: path.resolve(__dirname, "tsconfig.json"),
          },
        },
      },
    ],
  },
  devServer: {
    static: "./dist",
    hot: true,
  },
  plugins: [
    new webpack.DefinePlugin(envKeys),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new KombaiPlugin({
      compress: process.env.COMPRESS_EXTRACTION,
      outputFileName: "extracted-content",
    }),
  ],
};
