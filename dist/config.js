var root=this;root._APP_CONFIG={lang:"ru",meta:{lastSalesVolumeField:"p20103_2012",currencyOrder:1e3}},root._RESOURCES_CONFIG={baseUrl:"/rsearch",paths:{angular:"src/bower-components/angular/angular","angular-locale_ru":"src/bower-components/angular-i18n/angular-locale_ru","angular-locale_en":"src/bower-components/angular-i18n/angular-locale_en","ng-infinite-scroll":"src/bower-components/ngInfiniteScroll/ng-infinite-scroll",jquery:"src/bower-components/jquery/jquery",underscore:"src/bower-components/underscore/underscore","underscore.string":"src/bower-components/underscore.string/underscore.string",purl:"src/bower-components/purl/purl",i18n:"src/bower-components/nullpointer-i18n/i18n"},packages:[{name:"app",location:"src/app",main:"app"},{name:"icons",location:"src/app/icons",main:"icons"},{name:"l10n",location:"src/app/l10n",main:"l10n"},{name:"rsearch",location:"src/rsearch",main:"rsearch"}],shim:{angular:{exports:"angular"},"angular-locale_ru":{deps:["angular"]},"angular-locale_en":{deps:["angular"]},"ng-infinite-scroll":{deps:["angular"]},underscore:{exports:"_",deps:["underscore.string"],init:function(e){_.templateSettings={evaluate:/\{%([\s\S]+?)%\}/g,interpolate:/\{%=([\s\S]+?)%\}/g,escape:/\{%-([\s\S]+?)%\}/g},_.mixin(e)}}},config:{i18n:{templateSettings:{evaluate:"",interpolate:/\$\{([\s\S]+?)\}/g,escape:""},escape:!1}},map:{"*":{css:"src/bower-components/require-css/css",less:"src/bower-components/require-less/less",text:"src/bower-components/requirejs-text/text"}},less:{relativeUrls:!0},urlArgs:(new Date).getTime()};