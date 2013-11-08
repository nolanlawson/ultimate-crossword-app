'use strict';

angular.module('ultimate-crossword')
    .controller('MainController', ['$scope', '$http', 'constants', 'blocks',
        function ($scope, $http, constants, blocks) {


        $scope.blocks = blocks;

        function onError() {
            console.log('got an error');
        }

        $http({method: 'GET',
            url: constants.couchdb.url + '/_design/counts_to_blocks/_view/counts_to_blocks/',
            params: {limit: constants.pageSize, descending: true, 'include_docs' : true}})
            .success(function (data) {
                if (!data.rows) {
                    onError();
                }

                blocks.loadPage(data.rows);

            }).error(onError);


    }]);
