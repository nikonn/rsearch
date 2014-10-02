var root = this;

/*
 * config
 *
 */
//
root._APP_CONFIG = {
    lang: {
        defaultLang: 'ru'
    },
    meta: {
        // Параметр: Объём продаж за последний год
        lastSalesVolumeField: 'p20103_2013',
        currencyOrder: 1000
    }
};

//
root._RESOURCES_CONFIG = {
    baseUrl: '/rsearch',

    paths: {
        'angular':              'external_components/angular/angular',
        'angular-locale_ru':    'external_components/angular-i18n/angular-locale_ru',
        'angular-locale_en':    'external_components/angular-i18n/angular-locale_en',
        'ng-infinite-scroll':   'external_components/ngInfiniteScroll/ng-infinite-scroll',

        'jquery':               'external_components/jquery/jquery',
        'jquery.cookie':        'external_components/jquery.cookie/jquery.cookie',

        'underscore':           'external_components/underscore/underscore',
        'underscore.string':    'external_components/underscore.string/underscore.string',

        'purl':                 'external_components/purl/purl',

        'uuid':                 'external_components/node-uuid/uuid',

        'i18n':                 'external_components/nullpointer-i18n/i18n',

        // nkbcomment
        'backbone':                     'external_components/backbone/backbone',
        'iso8601':                      'external_components/iso8601/iso8601',
        'jquery.ui.widget':             'external_components/jquery-file-upload/jquery.ui.widget',
        'jquery.iframe-transport':      'external_components/jquery-file-upload/jquery.iframe-transport',
        'jquery.fileupload':            'external_components/jquery-file-upload/jquery.fileupload',
        'jquery.fileDownload':          'external_components/jquery.fileDownload/jquery.fileDownload',
        'dateformat':                   'external_components/nkbcomment/nkbcomment-lib/dateformat',
        'nkbcomment-defaults':          'external_components/nkbcomment/nkbcomment-defaults/defaults',
        'nkbcomment-message-widget':    'external_components/nkbcomment/nkbcomment-message-widget/js/message-widget',
        'nkbcomment-comment-utils':     'external_components/nkbcomment/nkbcomment-comment-widget/js/comment-utils',
        'nkbcomment-comment-widget':    'external_components/nkbcomment/nkbcomment-comment-widget/js/comment-widget'
    },

    packages: [{
        name: 'app',
        location: 'src/nkb-app',
        main: 'app'
    }, {
        name: 'app.login',
        location: 'src/nkb-app/components/login',
        main: 'login'
    }, {
        name: 'app.lang',
        location: 'src/nkb-app/components/lang',
        main: 'lang'
    }, {
        name: 'nkbcomment',
        location: 'src/nkbcomment',
        main: 'nkbcomment'
    }, {
        name: 'icons',
        location: 'src/icons',
        main: 'icons'
    }, {
        name: 'l10n',
        location: 'src/l10n',
        main: 'l10n'
    }, {
        name: 'resource',
        location: 'src/resource',
        main: 'resource'
    }, {
        name: 'user',
        location: 'src/user',
        main: 'user'
    }, {
        name: 'rsearch',
        location: 'src/rsearch',
        main: 'rsearch'
    }],

    shim: {
        'angular': {
            exports: 'angular'
        },
        'angular-locale_ru': {
            deps: ['angular']
        },
        'angular-locale_en': {
            deps: ['angular']
        },
        'ng-infinite-scroll': {
            deps: ['angular']
        },

        'jquery.cookie': {
            deps: ['jquery']
        },

        'underscore': {
            exports: '_',
            deps: ['underscore.string'],
            init: function(UnderscoreString) {
                _.templateSettings = {
                    evaluate:       /\{%([\s\S]+?)%\}/g,
                    interpolate:    /\{%=([\s\S]+?)%\}/g,
                    escape:         /\{%-([\s\S]+?)%\}/g
                };

                _.mixin(UnderscoreString.exports());
            }
        },

        // nkbcomment
        'backbone': {
            deps: ['underscore']
        },
        'dateformat': {
            deps: ['iso8601']
        },
        'nkbcomment-defaults': {
            deps: ['backbone', 'underscore', 'jquery' /* + остальные зависимости для nkbcomment-comment */, 'jquery.cookie', 'jquery.fileupload', 'jquery.fileDownload', 'dateformat']
        },
        'nkbcomment-comment-utils': {
            deps: ['nkbcomment-defaults']
        },
        'nkbcomment-message-widget': {
            deps: ['nkbcomment-defaults']
        },
        'nkbcomment-comment-widget': {
            deps: ['nkbcomment-defaults', 'nkbcomment-comment-utils', 'nkbcomment-message-widget']
        }
    },

    config: {
        'i18n': {
            // Должны отличаться от общих настроек шаблонизатора (например, underscore),
            // т.к. смысл шаблонизации i18n:
            //   только перевести текст шаблона,
            //   а далее использовать переведённый шаблон с шаблонизатором по умолчанию
            templateSettings: {
                evaluate:       '',
                interpolate:    /\$\{([\s\S]+?)\}/g,
                escape:         ''
            },
            escape: false
        }
    },

    map: {
        '*': {
            'css': 'external_components/require-css/css',
            'less': 'external_components/require-less/less',
            'text': 'external_components/requirejs-text/text'
        }
    },

    less: {
        relativeUrls: true
    },

    urlArgs: new Date().getTime()
};

/*
 * init
 *
 */
if (typeof define === 'function' && define.amd) {
    requirejs.config(root._RESOURCES_CONFIG);

    require(['app'], function(app){
        // init nkb-app
    });
}
