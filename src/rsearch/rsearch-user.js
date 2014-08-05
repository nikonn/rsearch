/**
 * @module rsearch-user
 * @desc RequireJS/Angular module
 * @author ankostyuk
 */
define(function(require) {'use strict';

                  require('underscore');
    var angular = require('angular');

    return angular.module('np.rsearch-user', [])
        //
        .factory('npRsearchUser', ['$log', '$rootScope', 'npRsearchResource', function($log, $rootScope, npRsearchResource){

            var user = null,
                userLimitsRequest;

            function applyUser(u) {
                user = u;
            }

            // API
            return {

                user: function() {
                    return {
                        isAuthenticated: function(){
                            return !!user;
                        },

                        isProductAvailable: function(productName){
                            return true;

//                            var me = this;
//
//                            if (!me.isAuthenticated()) {
//                                return false;
//                            }
//
//                            return true;
                        }
                    };
                },

                fetchUser: function() {
                    var userLimitsRequest = npRsearchResource.userLimits({
                        previousRequest: userLimitsRequest,
                        success: function(data){
                            applyUser({
                                limits: data
                            });
                        },
                        error: function(){
                            applyUser(null);
                        }
                    });

                    return userLimitsRequest;
                }
            };
        }]);
    //
});
