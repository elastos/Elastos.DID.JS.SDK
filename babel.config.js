// babel.config.js
module.exports = {
    "presets": [
        [
            '@babel/preset-env',
            {
                targets: {
                    esmodules: true,
                    node: 'current'
                }
            }
        ],
        '@babel/preset-typescript',
    ],
    "plugins": [
        ["@babel/plugin-proposal-decorators", { "legacy": true }],
        ["@babel/plugin-proposal-class-properties", { "loose": true }]
    ]
};