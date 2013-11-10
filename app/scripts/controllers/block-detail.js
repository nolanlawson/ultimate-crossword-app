'use strict';

angular.module('ultimate-crossword')
    .controller('BlockDetailController', ['$scope', '$route', 'blocks', '$http', 'constants',
        function ($scope, $route, blocksService, $http, constants) {

            $scope.blocksService = blocksService;

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
                    limit: constants.maxNumRelated
                };

                $http({method: 'GET', url: related_url, params: params})
                    .success(function (data) {

                        if (!data.rows) {
                            return onError(data);
                        }
                        var relatedBlocks = blocksService.transformRelatedBlocks(data.rows, block._id);

                        fetchBlockHintsIfNecessary(block, relatedBlocks);

                    })
                    .error(onError);
            }

            function fetchBlockHintsIfNecessary(block, relatedBlocks) {

                var keys = _.chain(_.flatten([block], relatedBlocks)).filter(function(blockOrRelatedBlock){
                    return blockOrRelatedBlock.hintsRedacted;
                }).pluck('_id').value();

                if (keys.length) {
                    fetchBlockHints(block, relatedBlocks, keys);
                } else { // no hints were redacted, nothing to do
                    onLoadComplete(block, relatedBlocks);
                }
            }

            function fetchBlockHints(block, relatedBlocks, keys) {
                var params = {
                    keys : JSON.stringify(keys),
                    include_docs : true
                };

                $http({method : 'GET', url : constants.couchdb.hints_url +'/_all_docs', params : params})
                    .success(function(data){
                        if (!data.rows) {
                            return onError(data);
                        }
                        blocksService.updateHints(_.flatten([block], relatedBlocks), data.rows);

                        onLoadComplete(block, relatedBlocks);
                    })
                    .error(onError);
            }

            function onLoadComplete(block, relatedBlocks) {
                block.relatedBlocks = relatedBlocks;
                block.expanded = true;

                // all done loading
                $scope.block = block;
                $scope.doneLoading = true;
            }

            fetchSummary();
        }
    ]);