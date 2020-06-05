const path = require('path');
const NoteFrequencyChartData = require('./src/NoteFrequencyChart/createData');

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
            },
            {
                test: /\.json$/,
                type: "javascript/auto",
                use: {
                  loader: "json-loader",
                },
            },
        ]
    }
}
