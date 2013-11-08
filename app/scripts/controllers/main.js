'use strict';

angular.module('ultimate-crossword')
    .controller('MainController', ['$scope', '$http', 'constants', 'blocks',
        function ($scope, $http, constants, blocks) {


            $scope.blocks = blocks;
            $scope.constants = constants;

            $scope.loadingPage = false;
            $scope.lastRow = null;

            $scope.getLabelClass = function (blockId) {
                return 'label-' + (parseInt(blockId, 10) % constants.numColors);
            };

            function onError() {
                $scope.loadingPage = false;
                console.log('got an error');
            }

            var url = constants.couchdb.url + '/_design/counts_to_blocks/_view/counts_to_blocks/';

            $scope.loadNextPage = function() {
                if ($scope.loadingPage) { // loading already in progress
                    return;
                }
                $scope.loadingPage = true;

                var params = {limit: constants.pageSize, descending: true, 'include_docs' : true};
                if ($scope.lastRow) { // next page
                    _.extend(params,{skip : 1, startkey : $scope.lastRow.key, startkey_docid : $scope.lastRow.doc._id});
                }

                $http({method: 'GET',
                    url: url,
                    params: params})
                    .success(function (data) {
                        if (!data.rows) {
                            onError();
                        }
                        $scope.loadingPage = false;

                        blocks.loadPage(data.rows);

                        $scope.lastRow = _.last(data.rows);


                    }).error(onError);
            };

            $scope.loadNextPage();

        }]);
