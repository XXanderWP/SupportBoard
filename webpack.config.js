const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const https = require('https');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { EnvTypesPlugin } = require('@xxanderwp/env-types-webpack-plugin');

const tsRule = () => {
  return {
    test: /\.tsx?$/,
    use: {
      loader: 'esbuild-loader',
      // loader: watch_mode ? 'swc-loader' : 'ts-loader',
    },
    exclude: /node_modules/,
  };
};

/**
 *
 * @param {'backend' | 'frontend'} target
 * @param {boolean} local
 */
const makeDefaultPart = (target, local, env, react = false) => {
  const plugins = [];

  if (react) {
    plugins.push(
      new HtmlWebpackPlugin({
        template: `./src/${target}/index.html`,
      })
    );
    plugins.push(
      new webpack.DefinePlugin({
        'window.UVICORN_PORT': `"${env.UVICORN_PORT}"`,
      })
    );
    plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: `./logo.png`,
            to: './logo.png',
          },
        ],
      })
    );
  }

  plugins.push(
    new Dotenv({
      systemvars: true,
      defaults: true,
    })
  );

  plugins.push(
    new webpack.DefinePlugin({
      'process.env.IS_LOCAL': !!local,
    })
  );

  plugins.push(
    new webpack.DefinePlugin({
      'process.env.MODULE': `'${target}'`,
    })
  );

  if (target === 'backend') {
    plugins.push(
      new EnvTypesPlugin({
        outputPath: 'src/types/nodejs.d.ts',
        disablePartialType: true,
        envFiles: ['.env.defaults', '.env'],
        silent: true,
      })
    );
  }

  const dev = !!local;

  return {
    entry: `./src/${target}/index.${!react ? 'ts' : 'tsx'}`,
    mode: dev ? 'development' : 'production',
    devtool: dev ? 'source-map' : undefined,
    module: {
      rules: [
        tsRule(),
        {
          test: /\.md$/i,
          use: 'raw-loader',
        },
        {
          test: /\.htm$/i,
          use: 'raw-loader',
        },
        {
          test: /\.(less|scss|css)$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'less-loader',
              options: {
                lessOptions: {
                  strictMath: true,
                },
              },
            },
          ],
        },
        {
          test: /\.(webp|webm|jpg|png|svg|ico|icns|mp3|gif)$/,
          loader: 'file-loader',
          options: {
            name: '[path][name].[ext]',
          },
        },
        {
          test: /\.node$/,
          loader: 'node-loader',
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json'],
    },
    name: target,
    output: {
      filename: 'index.js',
      path: path.join(__dirname, `bundle/${target}`),
    },
    plugins,
    watchOptions: {
      aggregateTimeout: 500,
      poll: 1000,
    },
    ignoreWarnings: [
      { message: /the request of a dependency is an expression/ },
      { message: /Can't resolve 'aws-sdk'/ },
      { message: /Can't resolve 'node-gyp'/ },
      { message: /Can't resolve 'nock'/ },
      { message: /Can't resolve 'npm'/ },
      { message: /Can't resolve 'mock-aws-s3'/ },
      { message: /Can't resolve 'bufferutil'/ },
      { message: /Can't resolve 'utf-8-validate'/ },
      { message: /Can't resolve 'react-native-sqlite-storage'/ },
      { message: /Can't resolve 'mongodb'/ },
      { message: /Can't resolve '@sap\/hana-client/ },
      { message: /Can't resolve 'hdb-pool'/ },
      { message: /Can't resolve 'mysql2'/ },
      { message: /Can't resolve 'oracledb'/ },
      { message: /Can't resolve 'pg'/ },
      { message: /Can't resolve 'pg-native'/ },
      { message: /Can't resolve 'pg-query-stream'/ },
      { message: /Can't resolve 'typeorm-aurora-data-api-driver'/ },
      { message: /Can't resolve 'redis'/ },
      { message: /Can't resolve 'ioredis'/ },
      { message: /Can't resolve 'better-sqlite3'/ },
      { message: /Can't resolve 'sqlite3'/ },
      { message: /Can't resolve 'sql.js'/ },
      { message: /Can't resolve 'mssql'/ },
      { message: /Can't resolve '@google-cloud\/spanner'/ },
    ],
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  };
};

module.exports = env => {
  const backendConfig = {
    ...makeDefaultPart('backend', env.target === 'local', env),
    target: 'node',
    node: { __dirname: true },
    optimization: {
      minimize: false,
    },
  };
  //   const frontendConfig = {
  //     ...makeDefaultPart('frontend', env.target === 'local', env, true),
  //     target: 'web',
  //     optimization: {
  //       minimize: false,
  //     },
  //   };

  //   return process.env.WEBPACK_SERVE
  //     ? [frontendConfig]
  //     : [frontendConfig, backendConfig];
  return process.env.WEBPACK_SERVE ? [] : [backendConfig];
};
