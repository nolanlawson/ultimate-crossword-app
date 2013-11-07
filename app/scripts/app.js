'use strict';

angular.module('ultimate-crossword', [
        'ngCookies',
        'ngResource',
        'ngSanitize'
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
            .otherwise({
                redirectTo: '/'
            });
    });
