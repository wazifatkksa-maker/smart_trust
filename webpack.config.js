const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ThemeWatcher = require('@salla.sa/twilight/watcher.js');
const path = require('path');

const asset = file => path.resolve('src/assets', file || '');
const pub = file => path.resolve('public', file || '');

module.exports = {
  entry: {
    app: [asset('styles/app.scss'), asset('js/app.js')],
    'product-card': asset('js/partials/product-card.js'),
    home: asset('js/home.js'),
    product: asset('js/product.js'),
    products: asset('js/products.js'),
    checkout: [asset('js/cart.js'), asset('js/thankyou.js')],
    pages: asset('js/pages.js'),
  },
  output: {
    path: pub(),
    clean: true,
    chunkFilename: '[name].[contenthash].js',
  },
  stats: { modules: false, assetsSort: 'name' },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        use: {
          loader: 'babel-loader',
          options: { presets: [['@babel/preset-env', { targets: 'defaults' }]] },
        },
      },
      {
        test: /\.(s[ac]|c)ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { url: false } },
          'postcss-loader',
          { loader: 'sass-loader', options: { sassOptions: { silenceDeprecations: ['import', 'global-builtin'] } } },
        ],
      },
    ],
  },
  plugins: [
    new ThemeWatcher(),
    new MiniCssExtractPlugin(),
    new CopyPlugin({ patterns: [{ from: asset('images'), to: pub('images') }] }),
  ],
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  performance: { hints: false },
};
