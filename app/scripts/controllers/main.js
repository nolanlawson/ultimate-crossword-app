'use strict';

angular.module('ultimate-crossword')
    .controller('MainController', ['$scope', '$http', 'constants', 'blocks', 'pouch',
        function ($scope, $http, constants, blocksService, pouch) {


            $scope.blocksService = blocksService;
            $scope.constants = constants;

            $scope.loadingPage = false;
            $scope.lastRow = null;
            $scope.pouch = pouch;

            function onError() {
                $scope.loadingPage = false;
                console.log('got an error');
            }

            var blocks_url = constants.couchdb.blocks_url + '/_design/counts_to_blocks/_view/counts_to_blocks/';
            var details_url = constants.couchdb.related_url + '/_all_docs';

            $scope.loadMoreRelated = function(block) {
                // fetch from CouchDB
                block.loadingRelated = true;
                var params = {
                    // my crazy convention for encoding the related blocks.
                    // I use this as the id for these documents to avoid having
                    // to have a separate views.  Saves space and time.  Whoosh.
                    startkey     : JSON.stringify(block._id + '~'),
                    endkey       : JSON.stringify(block._id + '~Z'),
                    include_docs : true,
                    limit        : constants.maxNumRelated
                };

                if (block.relatedBlocks && block.relatedBlocks.length > 0) {
                    // already loaded some related blocks, so now we're paging
                    var lastId = _.last(block.relatedBlocks)._id;
                    params.startkey = JSON.stringify(lastId);
                    params.skip = 1;
                }
                $http({method : 'GET',
                    url : details_url,
                    params : params})
                    .success(function(data){
                        block.loadingRelated = false;
                        if (!data.rows) {
                            return onError();
                        }

                        blocksService.loadRelated(block, data.rows);
                        block.expanded = true;
                        block.fetched = true;
                        var totalRelatedBlocks = (block.followingBlockCount + block.precedingBlockCount);
                        block.moreRelatedBlocks = totalRelatedBlocks - block.relatedBlocks.length;
                    })
                    .error(function(){
                        block.loadingRelated = false;
                        onError();
                    });
            };

            $scope.expandOrCollapse = function(block) {
                if (!block.expanded) {
                    if (!block.fetched) {
                        $scope.loadMoreRelated(block);
                    } else { // already fetched, no need to ask CouchDB
                        block.relatedBlocks = block.fetchedBlocks;
                        block.expanded = true;
                    }
                } else {
                    if (block.fetched) {
                        block.fetchedBlocks = block.relatedBlocks;
                        block.relatedBlocks = [];
                    }
                    block.expanded = false;
                }
            };

            $scope.loadNextPage = function() {
                if ($scope.loadingPage) { // loading already in progress
                    return;
                }
                $scope.loadingPage = true;

                var params = {limit: constants.pageSize, descending: true, 'include_docs' : true, stale : 'update_after'};
                if ($scope.lastRow) { // next page
                    _.extend(params,{skip : 1, startkey : $scope.lastRow.key, startkey_docid : $scope.lastRow.doc._id});
                }

                $http({method: 'GET',
                    url: blocks_url,
                    params: params})
                    .success(function (data) {
                        if (!data.rows) {
                            return onError();
                        }
                        $scope.loadingPage = false;

                        blocksService.loadPage(data.rows);

                        $scope.lastRow = _.last(data.rows);


                    }).error(function(){
                        $scope.loadingPage = false;
                        onError();
                    });
            };

            if (!$scope.blocksService.currentPage.length) { // no docs loaded yet
                $scope.loadNextPage();
            }

        }]);
