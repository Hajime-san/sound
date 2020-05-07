const path = require('path');

module.exports = {
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        port: 8000
    },
    entry: {
        bundle: './src/app.ts'
    },
    output: {
        path: path.join(__dirname,'dist'),
        filename: '[name].js'
    },
    resolve: {
        extensions:['.ts','.js']
    },
    module: {
        rules: [
            {
                test:/\.ts$/,loader:'ts-loader'
            }
        ]
    }
}
