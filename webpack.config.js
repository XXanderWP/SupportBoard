const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
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
const makeDefaultPart = (target, local, env) => {
  const plugins = [];

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
    entry: `./src/${target}/index.ts`,
    mode: dev ? 'development' : 'production',
    devtool: dev ? 'source-map' : undefined,
    module: {
      rules: [tsRule()],
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

  return process.env.WEBPACK_SERVE ? [] : [backendConfig];
};
