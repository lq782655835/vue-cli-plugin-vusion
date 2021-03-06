const fs = require('fs');
const path = require('path');
const chainCSS = require('../webpack/chainCSS');
const CopyPlugin = require('copy-webpack-plugin');
const FixMultifileCachePlugin = require('../webpack/plugins/FixMultifileCachePlugin');
const proxy = require('http-proxy-middleware');

module.exports = function chainDefault(api, vueConfig, vusionConfig) {
    // 同步 vusionConfig 和 vueConfig 的信息，尽量以 vueConfig 为基准
    if (vusionConfig.publicPath) // 如果填，用'./'吧
        vueConfig.publicPath = vusionConfig.publicPath;
    else
        vusionConfig.publicPath = vueConfig.publicPath;

    if (vusionConfig.outputPath)
        vueConfig.outputDir = vusionConfig.outputPath;
    else
        vusionConfig.outputPath = vueConfig.outputDir;

    api.chainWebpack((config) => {
        const mode = config.get('mode');

        // 添加 vue-cli-plugin-vusion context 下的模块路径，防止有些包找不到
        config.resolveLoader.modules.add(path.resolve(__dirname, '../node_modules'));

        let themeCSS = vusionConfig.theme.default;
        if (!themeCSS)
            themeCSS = vusionConfig.theme[Object.keys(vusionConfig.theme)[0]];

        // vue$, use default
        let alias = {
            '@': vusionConfig.srcPath,
            '@@': vusionConfig.libraryPath,
            library: vusionConfig.libraryPath,
            '~': process.cwd(),
            baseCSS: vusionConfig.baseCSSPath,
            themeCSS,
        };

        let cloudUIAlias = 'cloud-ui.vusion';
        if (vusionConfig.type === 'component' || vusionConfig.type === 'block')
            cloudUIAlias = 'cloud-ui.vusion/dist';
        else if (vusionConfig.type === 'library') {
            cloudUIAlias = path.dirname(vusionConfig.libraryPath);
            if (vusionConfig.name === 'cloud-ui')
                alias['cloud-ui.vusion'] = cloudUIAlias;
        }
        alias['cloud-ui'] = cloudUIAlias;
        // User custom
        alias = Object.assign(alias, vusionConfig.alias);

        /**
         * Default Mode
         */
        const resolveAlias = config.resolve.alias;
        Object.keys(alias).forEach((key) => resolveAlias.set(key, alias[key]));

        config.module.rule('vue')
            .test(/\.vue([\\/]index\.js)?$/)
            .use('vusion-loader')
            .loader('vusion-loader');

        // config.module.rules.delete('postcss');
        // config.module.rules.delete('scss');
        // config.module.rules.delete('sass');
        // config.module.rules.delete('less');
        // config.module.rules.delete('stylus');

        chainCSS(config, vueConfig, vusionConfig);

        const staticPath = path.resolve(process.cwd(), vusionConfig.staticPath || './static');
        if (!fs.existsSync(staticPath))
            config.plugins.delete('copy');
        else {
            // 有的时候找不到原来的 CopyPlugin，不知道为什么
            config.plugin('copy').use(CopyPlugin, [
                [{ from: staticPath, to: '', ignore: ['.*'] }],
            ]);
        }

        /**
         * Raw Mode
         */
        if (vusionConfig.mode === 'raw')
            config.module.rules.delete('js');

        config.plugins.delete('case-sensitive-paths');

        config.plugin('fix-multifile-cache').use(FixMultifileCachePlugin);
    });

    // Hack for devServer options
    if (vueConfig.pluginOptions && vueConfig.pluginOptions.proxy) {
        const proxys = vueConfig.pluginOptions.proxy;
        api.configureDevServer((app) => {
            proxys.forEach((p) => {
                app.use(proxy(p.context, p));
            });
        });
    }
};
