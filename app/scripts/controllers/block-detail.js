'use strict';

angular.module('ultimate-crossword')
    .controller('BlockDetailController', ['$scope', '$route', 'blocks', '$http', 'constants',
        function ($scope, $route, blocksService, $http, constants) {

            $scope.blocksService = blocksService;

            $scope.blockId = $route.current.params.q;

            $scope.block = null;
            $scope.doneLoading = false;

            var blocks_url = constants.couchdb.blocks_url + '/' + $scope.blockId;
            var details_url = constants.couchdb.details_url + '/_all_docs';


            function onError(data) {
                console.log('got an error ' + data);
                $scope.doneLoading = true;
            }

            var params = {descending: true, 'include_docs': true};

            $http({method: 'GET',
                url: blocks_url,
                params: params})
                .success(function (data) {

                    var block = blocksService.transformRowsIntoBlocks([
                        {doc: data, key: data.count}
                    ])[0];

                    var params = {
                        // my crazy convention for encoding the related blocks.
                        // I use this as the id for these documents to avoid having
                        // to have a separate views.  Saves space and time.  Whoosh.
                        startkey: JSON.stringify(block._id + '~'),
                        endkey: JSON.stringify(block._id + '~Z'),
                        include_docs: true,
                        limit: constants.maxNumRelated
                    };

                    $http({method: 'GET', url: details_url, params: params})
                        .success(function (data) {

                            if (!data.rows) {
                                return onError();
                            }

                            block.relatedBlocks = blocksService.transformRelatedBlocks(data.rows, block._id);
                            block.expanded = true;

                            // all done loading
                            $scope.block = block;
                            $scope.doneLoading = true;

                        })
                        .error(function () {
                            onError();
                        });


                }).error(function () {
                    onError();
                });
        }]);