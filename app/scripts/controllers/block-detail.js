'use strict';

angular.module('ultimate-crossword')
    .controller('BlockDetailController', ['$scope', '$route',
        function ($scope, $route) {
            $scope.blockId = $route.current.params.q;
        }
    ]);