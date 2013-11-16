'use strict';

angular.module('ultimate-crossword')
    .controller('BlockDetailController', ['$scope', '$route', 'blocks', '$http', 'constants', 'pouch',
        'blockFetcher',
        function ($scope, $route, blocksService, $http, constants, pouch, blockFetcherService) {

            $scope.blocksService = blocksService;
            $scope.pouch = pouch;

            $scope.blockId = $route.current.params.q;

            $scope.block = null;
            $scope.doneLoading = false;

            var blocks_url = constants.couchdb.blocks_url + '/' + $scope.blockId;
            var related_url = constants.couchdb.related_url + '/_all_docs';


            function onError(data) {
                console.log('got an error ' + data);
                $scope.doneLoading = true;
            }

            function fetchSummary() {
                var params = {descending: true, 'include_docs': true};

                $http({method: 'GET',
                    url: blocks_url,
                    params: params})
                    .success(function (data) {

                        var block = blocksService.transformRowsIntoBlocks([
                            {doc: data, key: data.count}
                        ])[0];

                        fetchRelatedBlocks(block);


                    }).error(onError);

            }

            function fetchRelatedBlocks(block) {
                var params = {
                    // my crazy convention for encoding the related blocks.
                    // I use this as the id for these documents to avoid having
                    // to have a separate views.  Saves space and time.  Whoosh.
                    startkey: JSON.stringify(block._id + '~'),
                    endkey: JSON.stringify(block._id + '~Z'),
                    include_docs: true,
                    limit : constants.maxNumRelated
                };
                if (block.relatedBlocks && block.relatedBlocks.length) { // we're paging
                    _.extend(params, {skip : 1, startkey : JSON.stringify(_.last(block.relatedBlocks)._id)});
                }

                $http({method: 'GET', url: related_url, params: params})
                    .success(function (data) {

                        if (!data.rows) {
                            return onError(data);
                        }
                        var relatedBlocks = blocksService.transformRelatedBlocks(data.rows, block._id);

                        onLoadComplete(block, relatedBlocks);

                    })
                    .error(onError);
            }

            $scope.fetchBlockHints = function (blockOrRelatedBlock) {
                blockFetcherService.fetchBlockHints(blockOrRelatedBlock, onError);
            };

            $scope.loadMoreRelated = function() {
                if (!$scope.loadingMoreRelated) {
                    $scope.loadingMoreRelated = true;
                    fetchRelatedBlocks($scope.block);
                }
            };

            function onLoadComplete(block, relatedBlocks) {

                block.relatedBlocks = (block.relatedBlocks || []).concat(relatedBlocks);
                block.expanded = true;

                // all done loading
                $scope.block = block;
                $scope.doneLoading = true;
                $scope.loadingMoreRelated = false;
                $scope.numRelatedLeftToShow = (block.followingBlockCount + block.precedingBlockCount) - block.relatedBlocks.length;
                $scope.nextPageSize = Math.min($scope.numRelatedLeftToShow, constants.maxNumRelated);

            }

            fetchSummary();
        }
    ]);