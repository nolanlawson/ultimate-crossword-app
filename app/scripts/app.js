'use strict';

angular.module('ultimate-crossword', [
        'ngCookies',
        'ngResource',
        'ngSanitize',
        '$strap.directives'
    ])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainController'
            })
            .when('/about', {
                templateUrl: 'views/about.html'
            })
            .when('/faq', {
                templateUrl: 'views/faq.html'
            })
            .when('/block/:q', {
                templateUrl : 'views/block-detail.html',
                controller: 'BlockDetailController'
            })
            .when('/search/:q', {
                templateUrl : 'views/search.html',
                controller: 'SearchController'
            })
            .otherwise({
                redirectTo: '/'
            });
    });
