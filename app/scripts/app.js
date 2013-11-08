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
            .otherwise({
                redirectTo: '/'
            });
    });
