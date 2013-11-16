'use strict';

angular.module('ultimate-crossword')
    .controller('RandomController', ['$location', 'constants',
        function ($location, constants) {
            if ($location.path() === '/random') {
                // redirect to a random block
                var min = constants.blockIdRange[0]; // inclusive
                var max = constants.blockIdRange[1]; // exclusive
                var blockId = min + Math.floor(Math.random() * (max - min + 1));
                $location.path('/block/' + blockId);
            }
        }]);
