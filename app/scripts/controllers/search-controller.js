'use strict';

angular.module('ultimate-crossword')
    .controller('SearchController', ['$scope', '$route', 'blocks', '$http', 'constants', 'search',
        function ($scope, $route, blocksService, $http, constants, searchService) {

            $scope.q = decodeURIComponent($route.current.params.q);
            $scope.blocksService = blocksService;

            // ensure that the search text appears in the search box
            searchService.q = $scope.q;

            function onSearchCompleted() {

                var blockLookup = {};

                // add block details (aka related blocks) to lookup
                _.forEach($scope.couchDetails, function(couchRow){
                    var sourceBlockId = couchRow.doc._id.split('~')[0];
                    var block = blocksService.transformRelatedBlocks([couchRow], sourceBlockId)[0]; //TODO: fixme, I'm ugly
                    blockLookup[couchRow.key] = block;
                });

                // add block summaries to lookup
                var summariesAsBlocks = blocksService.transformRowsIntoBlocks($scope.couchSummaries);
                _.forEach(summariesAsBlocks, function(blockSummary){
                    blockLookup[blockSummary._id] = blockSummary;
                });

                var results = _.map($scope.solrDocs, function(solrDoc){
                    var block = blockLookup[solrDoc.id];

                    // create a neat search result object
                    var result = _.pick(block, 'joinedHints', 'shortJoinedHints');
                    result = _.extend(result, {
                        blockIds : (solrDoc.docType === 'related' ? block.ids : [solrDoc.id, '12345']),
                        count    : (solrDoc.docType === 'related' ? block.count : block.soloCount)
                    });

                    return _.extend(result, solrDoc);

                });

                $scope.results = _.sortBy(results, function(result) {
                    return -result.count;
                });

                $scope.doneLoading = true;

            }

            function performGenericCouchSearch(docType, url, resultName, callback) {
                var couchIds = _.map(_.filter($scope.solrDocs, function(solrDoc){
                    return solrDoc.docType === docType;
                }), function(solrDoc){
                    return solrDoc.id;
                });

                if (!couchIds.length) { // no details
                    return callback();
                }

                var params = {include_docs : true, keys : JSON.stringify(couchIds)};
                $http({method : 'GET', url : url + '/_all_docs', params : params})
                    .success(function(data){
                        $scope[(resultName)] = data.rows;

                        callback();
                    })
                    .error(function(){
                        console.log('got an error');
                    })
                ;
            }

            function performCouchDetailsSearch() {
                performGenericCouchSearch('related', constants.couchdb.details_url, 'couchDetails', onSearchCompleted);
            }

            function performCouchSummariesSearch() {
                performGenericCouchSearch('summary', constants.couchdb.blocks_url, 'couchSummaries', performCouchDetailsSearch);
            }

            function performSolrSearch() {

                var params = {
                    q       : $scope.q,
                    defType : 'edismax',
                    qf      : 'hints',
                    fl      : 'id,docType,score',
                    wt      : 'json',
                    indent  : 'on',
                    rows    : 999999
                };
                $http({method: 'GET', url: constants.solr_url + '/select/', params: params})
                    .success(function (data) {

                        $scope.solrDocs = data.response.docs;

                        performCouchSummariesSearch();

                    })
                    .error(function () {
                        console.log('got an error');
                    });
            }

            if (!$scope.results) {
                performSolrSearch();
            }



        }]);