'use strict';

angular.module('ultimate-crossword')
    .controller('SearchController', ['$scope', '$route', 'blocks', '$http', 'constants', 'search', 'pouch',
        'blockFetcher',
        function ($scope, $route, blocksService, $http, constants, searchService, pouch, blockFetcherService) {

            $scope.pouch = pouch;
            $scope.blocksService = blocksService;
            $scope.constants = constants;
            $scope.results = [];
            $scope.initialLoadComplete = false;
            $scope.hintsToHighlight = {};

            // ensure that the search text appears in the search box
            $scope.q = decodeURIComponent($route.current.params.q);
            searchService.q = $scope.q;


            // thanks mozilla:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?
            // redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions
            function escapeRegExp(str){
                return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
            }
            var cheapHighlighter = new RegExp('\\b' + escapeRegExp($scope.q) + '\\b', 'gi');

            var intermediateResults = {};

            function onError(data) {
                // TODO: do something useful
                console.log('got an error: ' + data);
            }

            function addCheapHighlighting(block) {
                // Do cheap, regex-based highlighting because Solr's highlighting feature would be overkill
                // (too much bandwidth used, have to store hints, have to merge them, etc.)

                block.hintsWithCounts.forEach(function(hintWithCount){
                    var hint = hintWithCount[0];
                    if (hint.match(cheapHighlighter)) {
                        $scope.hintsToHighlight[(hint)] = true;
                    }
                });

                // TODO: bold the keywords or something
                //var htmlEscaped = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                //return (htmlEscaped).replace(cheapHighlighter, '<strong>$1</strong>');
            }

            function onSearchCompleted() {

                var blockLookup = {};

                // add block details (aka related blocks) to lookup
                _.forEach(intermediateResults.couchRelatedBlocks, function(couchRow){
                    var sourceBlockId = couchRow.doc._id.split('~')[0];
                    var block = blocksService.transformRelatedBlocks([couchRow], sourceBlockId)[0]; //TODO: fixme, I'm ugly
                    blockLookup[couchRow.key] = block;
                });

                // add block summaries to lookup
                var summariesAsBlocks = blocksService.transformRowsIntoBlocks(intermediateResults.couchSummaries);
                _.forEach(summariesAsBlocks, function(blockSummary){
                    blockLookup[blockSummary._id] = blockSummary;
                });

                var results = _.map(intermediateResults.solrDocs, function(solrDoc){
                    var block = blockLookup[solrDoc.id];

                    block.docType = solrDoc.docType;

                    addCheapHighlighting(block);

                    block.blockIds = (block.docType === 'related' ? block.ids : [solrDoc.id, '12345']);
                    block.count    = (block.docType === 'related' ? block.count : block.soloHintCount);

                    return block;

                });

                $scope.results = $scope.results.concat(results);
                $scope.initialLoadComplete = true;
                $scope.searchInProgress = false;
                $scope.numFound = intermediateResults.numFound;
                $scope.nextPageSize = Math.min(constants.searchPageSize, $scope.numFound - $scope.results.length);
                intermediateResults = {};

            }

            function performGenericCouchSearch(docType, url, resultName, callback) {
                var couchIds = _.map(_.filter(intermediateResults.solrDocs, function(solrDoc){
                    return solrDoc.docType === docType;
                }), function(solrDoc){
                    return solrDoc.id;
                });

                if (!couchIds.length) { // no details/related blocks
                    return callback();
                }

                var params = {include_docs : true, keys : JSON.stringify(couchIds)};
                $http({method : 'GET', url : url + '/_all_docs', params : params})
                    .success(function(data){
                        if (!data.rows) {
                            return onError(data);
                        }

                        intermediateResults[(resultName)] = data.rows;

                        callback();
                    })
                    .error(onError)
                ;
            }

            function performCouchRelatedBlocksSearch() {
                performGenericCouchSearch('related', constants.couchdb.related_url, 'couchRelatedBlocks', onSearchCompleted);
            }

            function performCouchSummariesSearch() {
                performGenericCouchSearch('summary', constants.couchdb.blocks_url, 'couchSummaries', performCouchRelatedBlocksSearch);
            }

            function performSolrSearch() {

                $scope.searchInProgress = true;

                var params = {
                    q          : $scope.q,
                    defType    : 'edismax',
                    qf         : 'hints',
                    fl         : 'id,docType',
                    // boost with a multiplicative boost so more popular blocks tend to appear first
                    boost      : 'log(popularity)',
                    wt         : 'json',
                    indent     : 'off',
                    omitHeader : true,
                    mm         : '100%',
                    offset     : ($scope.results && $scope.results.length) || 0,
                    rows       : constants.searchPageSize
                };
                $http({method: 'GET', url: constants.solr_url + '/select/', params: params})
                    .success(function (data) {
                        if (!(data.response && data.response.docs)) {
                            return onError(data);
                        }

                        var solrDocs = data.response.docs;
                        intermediateResults.numFound = data.response.numFound;

                        intermediateResults.solrDocs = solrDocs;

                        performCouchSummariesSearch();

                    })
                    .error(onError);
            }

            $scope.loadNextPage = function() {
                if (!$scope.searchInProgress) {
                    performSolrSearch();
                }
            };

            $scope.fetchBlockHints = function (blockOrRelatedBlock) {
                blockFetcherService.fetchBlockHints(blockOrRelatedBlock, onError, function onSuccess(){
                    addCheapHighlighting(blockOrRelatedBlock);
                });

            };

            if (!$scope.initialLoadComplete) {
                performSolrSearch();
            }
        }]);