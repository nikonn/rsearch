/**
 * @module rsearch-navigation
 * @desc RequireJS/Angular module
 * @author ankostyuk
 */
define(function(require) {'use strict';

    var template        = require('text!./views/rsearch-navigation.html');

                          require('jquery');
                          require('underscore');
    var i18n            = require('i18n'),
        angular         = require('angular');

                          require('user');

    return angular.module('np.rsearch-navigation', ['np.user'])
        //
        .run([function(){
            template = i18n.translateTemplate(template);
        }])
        //
        .directive('npRsearchNavigation', ['$log', '$interpolate', '$q', '$timeout', '$rootScope', '$window', 'npRsearchViews', 'npRsearchMetaHelper', 'npRsearchResource', 'npUser', 'appConfig', function($log, $interpolate, $q, $timeout, $rootScope, $window, npRsearchViews, npRsearchMetaHelper, npRsearchResource, npUser, appConfig){
            return {
                restrict: 'A',
                template: template,
                scope: {},
                link: function(scope, element, attrs) {
                    //
                    var windowElement   = angular.element($window),
                        viewsElement    = element.find('.views'),
                        nodeListView    = npRsearchViews.createNodeListView(viewsElement, scope),
                        nodeFormView    = npRsearchViews.createNodeFormView(viewsElement, scope);

                    /*
                     * init
                     *
                     */
                    var init                    = false,
                        user                    = npUser.user(),
                        initMetaDefer           = $q.defer(),
                        initMetaPromise         = initMetaDefer.promise,
                        initPromise             = $q.all([initMetaPromise]),
                        initDeferredFunctions   = [];

                    $q.all(initPromise).then(initSuccess);

                    function initSuccess() {
                        var me = this;

                        init = true;

                        _.each(initDeferredFunctions, function(f){
                            f.func.apply(me, f.args);
                        });
                    }

                    function functionAfterInit(func, args) {
                        var me = this;

                        if (init) {
                            func.apply(me, args);
                        } else {
                            initDeferredFunctions.push({
                                func: func,
                                args: args
                            });
                        }
                    }

                    //
                    $rootScope.$on('np-rsearch-meta-ready', initByMeta);

                    function initByMeta() {
                        search.byNodeTypes = {};

                        _.each(npRsearchMetaHelper.getNodeTypes(), function(data, nodeType){
                            search.byNodeTypes[nodeType] = {
                                  nodeType: nodeType,
                                  resultPriority: data.searchResultPriority,
                                  pageConfig: null,
                                  request: null,
                                  result: null,
                                  nodeList: null
                              };
                        });

                        initMetaDefer.resolve();
                    }

                    /*
                     * utils
                     *
                     */
                    function resetPageConfig() {
                        return {
                            page: 1,
                            pageSize: 20
                        };
                    }

                    function noMore(result) {
                        return result ? result.pageNumber >= result.pageCount : null;
                    }

                    function isEmptyResult(result) {
                        return result ? result.total === 0 : true;
                    }

                    function setNodeList(object) {
                        object.nodeList = object.result && object.result.list ? object.result.list : [];
                    }

                    function pushNodeList(object, callback) {
                        if (object.result) {
                            _.each(object.result.list, function(node){
                                object.nodeList.push(node);
                            });
                            callback(noMore(object.result));
                        } else {
                            callback(true);
                        }
                    }

                    /*
                     * search
                     *
                     */
                    var search = {
                        query: null,
                        total: null,
                        activeResult: null,
                        byNodeTypes: null,
                        isEmptyResult: isEmptySearchResult,
                        getTotalByNodeType: getSearchTotalByNodeType,
                        showResult: showSearchResult
                    };

                    $rootScope.$on('np-rsearch-input-refresh', function(e, text, initiator){
                        if (initiator !== history) {
                            functionAfterInit(doSearch, [text]);
                        }
                    });

                    function doSearch(query) {
                        search.query = query;

                        nodeFormView.hide();
                        clearBreadcrumbs();
                        clearNodeRelationsFilter();
                        hideRelationsFilters();
                        clearMessages();

                        if (_.isBlank(search.query)) {
                            reset();
                            return;
                        }

                        var searchPromises = [];

                        loading(function(done){
                            _.each(search.byNodeTypes, function(byNodeType){
                                byNodeType.pageConfig = resetPageConfig();
                                byNodeType.nodeList = null;
                                searchRequest(byNodeType);
                                searchPromises.push(byNodeType.request.completePromise);
                            });

                            // ! При конструкции ['finally'](...) - генерятся исключения, но не отображаются в консоли
                            $q.all(searchPromises).then(complete, complete);

                            function complete() {
                                checkSearchResult();
                                done();
                            }
                        });
                    }

                    function searchRequest(byNodeType) {
                        byNodeType.request = npRsearchResource.search({
                            q: search.query,
                            nodeType: byNodeType.nodeType,
                            pageConfig: byNodeType.pageConfig,
                            previousRequest: byNodeType.request,
                            success: function(data, status){
                                complete(data);
                            },
                            error: function(data, status){
                                complete(null);
                            }
                        });

                        function complete(result) {
                            byNodeType.result = result;
                        }
                    }

                    function checkSearchResult() {
                        var resultPriority  = 0,
                            activeResult;

                        search.total = 0;

                        _.each(search.byNodeTypes, function(byNodeType, nodeType){
                            var result = byNodeType.result;

                            if (result) {
                                search.total += result.total;

                                if (result.total && byNodeType.resultPriority > resultPriority) {
                                    resultPriority = byNodeType.resultPriority;
                                    activeResult = nodeType;
                                }

                                setNodeList(byNodeType);

                                byNodeType.total = result.total;
                            } else {
                                byNodeType.total = null;
                            }
                        });

                        if (activeResult) {
                            var accentedResult = checkAccentedResultBySearch(activeResult);

                            if (!accentedResult) {
                                showSearchResult(activeResult);
                            }
                        } else {
                            nodeListView.clear();
                        }
                    }

                    function getSearchTotalByNodeType(nodeType) {
                        return (search.byNodeTypes && search.byNodeTypes[nodeType].total) || null;
                    }

                    function showSearchResult(nodeType, breadcrumb) {
                        var byNodeType = search.byNodeTypes[nodeType];

                        setSearchResult(nodeType, breadcrumb);

                        nodeFormView.hide();
                        clearNodeRelationsFilter();
                        hideRelationsFilters();
                        clearMessages();

                        nodeListView.showItemNumber(false);

                        nodeListView.reset(byNodeType.nodeList, noMore(byNodeType.result), function(callback){
                            loading(function(done){
                                byNodeType.pageConfig.page++;

                                searchRequest(byNodeType);

                                // ! При конструкции ['finally'](...) - генерятся исключения, но не отображаются в консоли
                                byNodeType.request.promise.then(complete, complete);

                                function complete() {
                                    pushNodeList(byNodeType, callback);
                                    done();
                                }
                            });
                        });
                    }

                    function setSearchResult(nodeType, breadcrumb) {
                        search.activeResult = nodeType;
                        setSearchBreadcrumb(nodeType, breadcrumb);
                    }

                    function isEmptySearchResult() {
                        return search.total === 0;
                    }

                    /*
                     * node form
                     *
                     */
                    var nodeForm = {
                        egrulRequest: null
                    };

                    $rootScope.$on('np-rsearch-node-select', function(e, node){
                        showNodeForm(node);
                    });

                    function nodeFormEgrulList(node) {
                        if (node._type !== 'COMPANY') {
                            return $q.all();
                        }

                        if (!user.isAuthenticated()) {
                            node.__egrulList = [];
                            return $q.all();
                        }

                        nodeForm.egrulRequest = npRsearchResource.egrulList({
                            node: node,
                            previousRequest: nodeForm.egrulRequest,
                            success: function(data, status){
                                node.__egrulList = data;
                            },
                            error: function(data, status){
                                node.__egrulList = [];
                            }
                        });

                        return nodeForm.egrulRequest.completePromise;
                    }

                    function showNodeForm(node, breadcrumb, noHistory, noSearchHistory) {
                        if (!noHistory && !noSearchHistory) {
                            checkSearchToHistory();
                        }

                        loading(function(done){
                            var nodePromises = [];

                            // egrul list
                            nodePromises.push(nodeFormEgrulList(node));

                            // user
                            nodePromises.push(npUser.fetchUser());

                            // ! При конструкции ['finally'](...) - генерятся исключения, но не отображаются в консоли
                            $q.all(nodePromises).then(complete, complete);

                            function complete() {
                                nodeListView.clear();
                                clearNodeRelationsFilter();
                                hideRelationsFilters();
                                clearMessages();

                                nodeFormView.setNode(node);
                                nodeFormView.show(node);

                                pushNodeFormBreadcrumb(node, breadcrumb);

                                npRsearchViews.scrollTop();

                                if (!noHistory) {
                                    checkNodeFormToHistory();
                                }

                                done();
                            }
                        });
                    }

                    /*
                     * relations
                     *
                     */
                    var byRelationsStore = {};

                    $rootScope.$on('np-rsearch-node-form-relations-click', function(e, node, direction, relationType){
                        relationsClick(node, direction, relationType);
                    });

                    function relationsClick(node, direction, relationType) {
                        if (user.isProductAvailable('relations_find_related')) {
                            showRelations(node, direction, relationType);
                        } else {
                            showProductInfo('relations_find_related');
                        }
                    }

                    function showRelations(node, direction, relationType, key, breadcrumb, noHistory) {
                        nodeFormView.hide();
                        setNodeRelationsFilter(node, direction, relationType);
                        hideRelationsFilters();
                        clearMessages();

                        var index       = pushRelationsBreadcrumb(node, direction, relationType, breadcrumb),
                            byRelations = byRelationsStore[key];

                        if (byRelations) {
                            resetRelationsNodeListView(byRelations);

                            if (!noHistory) {
                                checkNodeRelationsToHistory();
                            }
                        } else {
                            byRelations = byRelationsStore[index] = {
                                node: node,
                                direction: direction,
                                relationType: relationType,
                                relationMap: npRsearchMetaHelper.buildRelationMap(node),
                                pageConfig: null,
                                request: null,
                                result: null,
                                nodeList: null
                            };

                            doRelations(byRelations, true, noHistory);
                        }
                    }

                    function doRelations(byRelations, checkAccentedResult, noHistory) {
                        loading(function(done){
                            clearMessages();

                            byRelations.pageConfig = resetPageConfig();

                            relationsRequest(byRelations);

                            // ! При конструкции ['finally'](...) - генерятся исключения, но не отображаются в консоли
                            byRelations.request.promise.then(complete, complete);

                            function complete() {
                                setNodeList(byRelations);

                                var accentedResult = checkAccentedResult && checkAccentedResultByRelations(byRelations);

                                if (!accentedResult) {
                                    resetRelationsNodeListView(byRelations);

                                    if (!noHistory) {
                                        checkNodeRelationsToHistory();
                                    }
                                }

                                done();
                            }
                        });
                    }

                    function resetRelationsNodeListView(byRelations) {
                        if (isEmptyResult(byRelations.result)) {
                            showMessage('FILTERS_RESULT_EMPTY');
                        }

                        nodeListView.showItemNumber(byRelations.result && byRelations.result.total > 1);

                        nodeListView.reset(byRelations.nodeList, noMore(byRelations.result), function(callback){
                            loading(function(done){
                                byRelations.pageConfig.page++;

                                relationsRequest(byRelations);

                                // ! При конструкции ['finally'](...) - генерятся исключения, но не отображаются в консоли
                                byRelations.request.promise.then(complete, complete);

                                function complete() {
                                    pushNodeList(byRelations, callback);
                                    done();
                                }
                            });
                        });

                        nodeListView.setTargetInfo(getLastTargetInfo());

                        initRelationsFilters(byRelations);
                    }

                    function relationsRequest(byRelations) {
                        var filter = {};

                        _.each(byRelations.filters, function(f){
                            _.extend(filter, f.condition);
                        });

                        byRelations.request = npRsearchResource.relations({
                            node: byRelations.node,
                            direction: byRelations.direction,
                            relationType: byRelations.relationType,
                            pageConfig: byRelations.pageConfig,
                            filter: filter,
                            previousRequest: byRelations.request,
                            success: function(data, status){
                                complete(data);
                            },
                            error: function(data, status){
                                complete(null);
                            }
                        });

                        function complete(result) {
                            byRelations.result = result;
                        }
                    }

                    /*
                     * breadcrumbs
                     *
                     */
                    var breadcrumbs = {
                        list: [],
                    };

                    $rootScope.$on('np-rsearch-navigation-breadcrumb-go', function(e, breadcrumb){
                        goByBreadcrumb(breadcrumb);
                    });

                    function isBreadcrumbs() {
                        return getBreadcrumbSize() > 1;
                    }

                    function setSearchBreadcrumb(nodeType, breadcrumb) {
                        if (breadcrumb) {
                            return breadcrumb.index;
                        }

                        var index = 0;

                        breadcrumbs.list[index] = {
                            index: index,
                            type: 'SEARCH',
                            data: {
                                nodeType: nodeType
                            }
                        };

                        return index;
                    }

                    function pushNodeFormBreadcrumb(node, breadcrumb) {
                        if (breadcrumb) {
                            return breadcrumb.index;
                        }

                        var index = getBreadcrumbSize();

                        breadcrumbs.list[index] = {
                            index: index,
                            type: 'NODE_FORM',
                            data: {
                                node: node,
                                targetInfo: getLastTargetInfo()
                            }
                        };

                        return index;
                    }

                    function pushRelationsBreadcrumb(node, direction, relationType, breadcrumb) {
                        if (breadcrumb) {
                            return breadcrumb.index;
                        }

                        var index = getBreadcrumbSize();

                        breadcrumbs.list[index] = {
                            index: index,
                            type: 'NODE_RELATIONS',
                            data: {
                                node: node,
                                direction: direction,
                                relationType: relationType
                            }
                        };

                        return index;
                    }

                    function goByBreadcrumb(breadcrumb) {
                        if (isLastBreadcrumb(breadcrumb)) {
                            return;
                        }

                        var index           = breadcrumb.index,
                            nextBreadcrumb  = breadcrumbs.list[index + 1];

                        clearBreadcrumbs(index + 1);

                        if (breadcrumb.type === 'SEARCH') {
                            showSearchResult(breadcrumb.data.nodeType, breadcrumb);
                            highlightNodeInListByBreadcrumb(nextBreadcrumb);
                        } else
                        if (breadcrumb.type === 'NODE_FORM') {
                            showNodeForm(breadcrumb.data.node, breadcrumb);
                        } else
                        if (breadcrumb.type === 'NODE_RELATIONS') {
                            showRelations(breadcrumb.data.node, breadcrumb.data.direction, breadcrumb.data.relationType, index, breadcrumb);
                            highlightNodeInListByBreadcrumb(nextBreadcrumb);
                        }
                    }

                    function clearBreadcrumbs(toIndex) {
                        toIndex = toIndex || 0;

                        for (var i = toIndex + 1; i < getBreadcrumbSize(); i++) {
                            delete byRelationsStore[i];
                        }

                        breadcrumbs.list = breadcrumbs.list.slice(0, toIndex);
                    }

                    function clearLastBreadcrumb() {
                        clearBreadcrumbs(getBreadcrumbSize() - 1);
                    }

                    function isLastBreadcrumb(breadcrumb) {
                        return breadcrumb.index === getBreadcrumbSize() - 1;
                    }

                    function getLastBreadcrumb() {
                        return breadcrumbs.list[getBreadcrumbSize() - 1];
                    }

                    function getBreadcrumbSize() {
                        return _.size(breadcrumbs.list);
                    }

                    //
                    function getLastTargetInfo() {
                        var byRelations = byRelationsStore[getBreadcrumbSize() - 1];

                        return byRelations ? {
                            node: byRelations.node,
                            relationInfo: {
                                direction: byRelations.direction,
                                relationType: byRelations.relationType,
                                relationMap: byRelations.relationMap
                            }
                        } : null;
                    }

                    function highlightNodeInListByBreadcrumb(breadcrumb) {
                        if (breadcrumb && breadcrumb.type === 'NODE_FORM') {
                            // TODO Не прокручивать до ноды,
                            // а прокрутить до сохраненного положения прокрутки
                            // и выделить ноду?
                            nodeListView.scrollToNode(breadcrumb.data.node);
                        }
                    }

                    /*
                     * accented result
                     *
                     */
                    function checkAccentedResultBySearch(activeResult) {
                        var individualResult = search.byNodeTypes['INDIVIDUAL'].result,
                            node;

                        if (search.total === 1) {
                            node = search.byNodeTypes[activeResult].result.list[0];
                        } else if (individualResult && individualResult.total === 1) {
                            var n = individualResult.list[0];
                            node = n.gender ? n : null;
                        }

                        if (!node) {
                            return false;
                        }

                        setSearchResult(node._type);
                        showNodeForm(node, null, false, true);

                        return true;
                    }

                    function checkAccentedResultByRelations(byRelations) {
                        if (!byRelations.result) {
                            return null;
                        }

                        if (byRelations.result.total !== 1) {
                            return false;
                        }

                        var node = byRelations.result.list[0];

                        showNodeForm(node);

                        return true;
                    }

                    /*
                     * filters
                     *
                     */
                    var nodeRelationsFilter = {
                        node: null,
                        active: null,
                        relationsClick: function(direction, relationType){
                            if (buildNodeRelationActiveKey(direction, relationType) === nodeRelationsFilter.active) {
                                return;
                            }

                            clearLastBreadcrumb();
                            relationsClick(nodeRelationsFilter.node, direction, relationType);
                        },
                    };

                    function buildNodeRelationActiveKey(direction, relationType) {
                        return direction + '::' + relationType;
                    }

                    function setNodeRelationsFilter(node, direction, relationType) {
                        nodeRelationsFilter.node = node;
                        nodeRelationsFilter.active = buildNodeRelationActiveKey(direction, relationType);
                    }

                    function clearNodeRelationsFilter() {
                        nodeRelationsFilter.node = null;
                        nodeRelationsFilter.active = null;
                    }

                    function hideRelationsFilters() {
                        $rootScope.$emit('np-rsearch-filters-toggle-region-filter', false);
                        $rootScope.$emit('np-rsearch-filters-toggle-inn-filter', false);
                    }

                    function initRelationsFilters(byRelations) {
                        if (!byRelations.result) {
                            return;
                        }

                        var filters = byRelations.filters;

                        if (!filters) {
                            var total = byRelations.result.total;

                            var regionFilter = {
                                values: byRelations.result.info.nodeFacet && byRelations.result.info.nodeFacet.region_code,
                                value: null,
                                total: total,
                                callback: function(value){
                                    regionFilter.value = value;
                                    regionFilter.condition = {
                                        'node.region_code.equals': value
                                    };
                                    doRelations(byRelations, false, true);
                                }
                            };

                            var innFilter = {
                                values: byRelations.result.info.relFacet && byRelations.result.info.relFacet.inn,
                                value: null,
                                total: total,
                                callback: function(value){
                                    innFilter.value = value;
                                    innFilter.condition = {};
                                    if (value === false) {
                                        innFilter.condition['rel.inn.exists'] = value;
                                    } else if (value) {
                                        innFilter.condition['rel.inn.equals'] = value;
                                    }
                                    doRelations(byRelations, false, true);
                                }
                            };

                            filters = {
                                region: regionFilter,
                                inn: innFilter
                            };

                            byRelations.filters = filters;
                        }

                        if (filters.region.values) {
                            $rootScope.$emit('np-rsearch-filters-set-region-filter-data', filters.region);
                            $rootScope.$emit('np-rsearch-filters-toggle-region-filter', true);
                        }

                        if (filters.inn.values) {
                            $rootScope.$emit('np-rsearch-filters-set-inn-filter-data', filters.inn);
                            $rootScope.$emit('np-rsearch-filters-toggle-inn-filter', true);
                        }
                    }

                    /*
                     * loading
                     *
                     */
                    var loadingShowDelay = 500,
                        loadingId;

                    function loading(operation) {
                        loadingId = _.uniqueId();

                        process(loadingId, operation);

                        function process(id, operation) {
                            var complete = false;

                            $timeout(function(){
                                if (!complete && id === loadingId) {
                                    element.addClass('loading');
                                }
                            }, loadingShowDelay);

                            operation(done);

                            function done() {
                                $timeout(function(){
                                    if (id === loadingId) {
                                        element.removeClass('loading');
                                        complete = true;
                                    }
                                });
                            }
                        }
                    }

                    /*
                     * products
                     *
                     */
                    var productConfig = appConfig.product || {};

                    $rootScope.$on('np-rsearch-node-form-product-click', function(e, productName, node){
                        if (user.isProductAvailable(productName)) {
                            purchaseProduct(productName, {
                                node: node
                            });
                        } else {
                            showProductInfo(productName);
                        }
                    });

                    function showProductInfo(productName, context) {
                        var url = $interpolate(productConfig[productName]['info.url'])(context);

                        $window.open(url, '_blank');
                    }

                    function purchaseProduct(productName, context) {
                        var url = $interpolate(productConfig[productName]['purchase.url'])(context);

                        $window.open(url, '_blank');
                    }

                    /*
                     * messages
                     *
                     */
                    var messages = {
                        message: null
                    };

                    function showMessage(message) {
                        messages.message = message;
                    }

                    function clearMessages() {
                        messages.message = null;
                    }

                    /*
                     * browser history
                     *
                     */
                    var History = function() {
                        var windowHistory   = $window.history,
                            isHistory       = windowHistory && windowHistory.pushState,
                            // historyId -
                            // Для идентификации истории в контексте только данного приложения,
                            // если в браузерной истории есть состояния от предыдущего выполнения приложения,
                            // например, пользователь перезагрузил страницу, то данная история учитываться не будет.
                            // Это делается для того, чтобы исключить ошибки в работе истории при обновлении приложения.
                            // TODO Вместо appConfig.uuid, использовать идентификатор сборки приложения,
                            // т.к. в пределах одной сборки "старые истории" должны работать.
                            // TODO В случае игнорирования "старой истории" пользователь не видит изменений
                            // при манипуляциях с кнопками "вперед/назад" -- это плохо, нужно
                            // или извещать пользователя об этом, или чистить историю (не тривиально).
                            // Или забить на данный UX -- случаи когда пользователь перезагружает страницу редки,
                            // а когда пользователь долго работает с приложением,
                            // не закрывая страницу (и в это время приложение обновляется) еще более редки.
                            historyId       = appConfig.uuid,
                            historyList     = [];

                        windowElement.bind('popstate', function(e){
                            pop(e.originalEvent.state);
                        });

                        function isHistoryStateValid(state) {
                            return state && state.historyId === historyId;
                        }

                        function getHistorySize() {
                            return historyList.length;
                        }

                        function push(type) {
                            if (!isHistory) {
                                return;
                            }

                            var currentHistoryIndex = isHistoryStateValid(windowHistory.state) ? windowHistory.state.historyIndex : -1,
                                historyIndex        = currentHistoryIndex + 1;

                            var historyData = {
                                type: type,
                                searchQuery: search.query,
                                lastBreadcrumb: getLastBreadcrumb(),
                                breadcrumbs: copyBreadcrumbs(breadcrumbs),
                                byRelationsStore: copyRelationsStore(byRelationsStore)
                            };

                            var state = {
                                historyId: historyId,
                                historyIndex: historyIndex
                            };

                            if (getHistorySize() > historyIndex + 1) {
                                historyList = historyList.slice(0, historyIndex);
                            }

                            if (type === 'SEARCH') {
                                historyData.search = copySearch(search);
                            }

                            historyList[historyIndex] = historyData;
                            windowHistory.pushState(state, '');
                        }

                        function pop(state) {
                            if (!isHistory || !isHistoryStateValid(state)) {
                                return;
                            }

                            var historyData     = historyList[state.historyIndex],
                                breadcrumb      = historyData.lastBreadcrumb,
                                nextHistoryData = historyList[state.historyIndex + 1],
                                nextBreadcrumb  = nextHistoryData && nextHistoryData.lastBreadcrumb;


                            $rootScope.$emit('np-rsearch-input-set-text', historyData.searchQuery, history);

                            copyBreadcrumbs(historyData.breadcrumbs, breadcrumbs);
                            byRelationsStore = copyRelationsStore(historyData.byRelationsStore);

                            if (historyData.type === 'SEARCH') {
                                copySearch(historyData.search, search);
                                showSearchResult(breadcrumb.data.nodeType, breadcrumb);
                                highlightNodeInListByBreadcrumb(nextBreadcrumb);
                            } else
                            if (historyData.type === 'NODE_FORM') {
                                showNodeForm(breadcrumb.data.node, breadcrumb, true);
                            } else
                            if (historyData.type === 'NODE_RELATIONS') {
                                showRelations(breadcrumb.data.node, breadcrumb.data.direction, breadcrumb.data.relationType, breadcrumb.index, breadcrumb, true);
                                highlightNodeInListByBreadcrumb(nextBreadcrumb);
                            }

                            scope.$apply();
                        }

                        return {
                            push: push
                        };
                    };

                    var history = new History();

                    function checkSearchToHistory() {
                        var lastBreadcrumb = getLastBreadcrumb();

                        if (lastBreadcrumb.type === 'SEARCH') {
                            history.push('SEARCH');
                        }
                    }

                    function checkNodeFormToHistory() {
                        history.push('NODE_FORM');
                    }

                    function checkNodeRelationsToHistory() {
                        history.push('NODE_RELATIONS');
                    }

                    function copyBreadcrumbs(src, dst) {
                        dst = dst || {};

                        dst.list = _.clone(src.list);

                        return dst;
                    }

                    function copyRelationsStore(src) {
                        return _.clone(src);
                    }

                    function copySearch(src, dst) {
                        dst = dst || {};

                        dst.query           = src.query;
                        dst.total           = src.total;
                        dst.activeResult    = src.activeResult;

                        dst.byNodeTypes = dst.byNodeTypes || {};

                        _.each(src.byNodeTypes, function(srcByNodeType, nodeType){
                            var dstByNodeType = dst.byNodeTypes[nodeType] || (dst.byNodeTypes[nodeType] = {});

                            dstByNodeType.total         = srcByNodeType.total;
                            dstByNodeType.nodeList      = _.clone(srcByNodeType.nodeList);
                            dstByNodeType.pageConfig    = _.clone(srcByNodeType.pageConfig);
                        });

                        return dst;
                    }

                    /*
                     * user
                     *
                     */
                    $rootScope.$on('app-user-login', function(e){
                        var lastBreadcrumb = getLastBreadcrumb();

                        if (lastBreadcrumb && lastBreadcrumb.type === 'NODE_FORM') {
                            loading(function(done){
                                // Перезапросить список выписок ЕГРЮЛ
                                nodeFormEgrulList(lastBreadcrumb.data.node).then(done, done);
                            });
                        }
                    });


                    /*
                     * scope
                     *
                     */
                    _.extend(scope, {
                        search: search,
                        messages: messages,
                        breadcrumbs: breadcrumbs,
                        isBreadcrumbs: isBreadcrumbs,
                        nodeRelationsFilter: nodeRelationsFilter
                    });

                    function reset() {
                        search.total = null;

                        _.each(search.byNodeTypes, function(byNodeType, nodeType){
                            byNodeType.request.abort();
                            byNodeType.total = null;
                        });

                        nodeListView.clear();
                    }
                }
            };
        }]);
    //
});
