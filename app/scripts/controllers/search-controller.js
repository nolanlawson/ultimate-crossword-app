'use strict';

angular.module('ultimate-crossword')
    .controller('SearchController', ['$scope', '$route', 'blocks', '$http', 'constants', 'search', 'pouch', '$location',
        'blockFetcher',
        function ($scope, $route, blocksService, $http, constants, searchService, pouch, $location, blockFetcherService) {

            $scope.pouch = pouch;
            $scope.blocksService = blocksService;
            $scope.constants = constants;
            $scope.results = [];
            $scope.initialLoadComplete = false;
            $scope.hintsToHighlight = {};

            // thanks mozilla:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?
            // redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions
            function escapeRegExp(str){
                return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
            }

            // this is the "my guesses" mode, where we just re-use the search controller for convenience
            $scope.myGuessesMode = ($location.path() === '/myguesses');

            if (!$scope.myGuessesMode) {
                // ensure that the search text appears in the search box
                $scope.q = decodeURIComponent($route.current.params.q);
                searchService.q = $scope.q;

                $scope.cheapHighlighter = new RegExp('\\b' + escapeRegExp($scope.q) + '\\b', 'gi');
            }

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
                    if (hint.match($scope.cheapHighlighter)) {
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

                    if (!$scope.myGuessesMode) {
                        addCheapHighlighting(block);
                    }

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
                    start      : ($scope.results && $scope.results.length) || 0,
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

            function loadMyGuesses() {
                // sort all guess Ids

                // todo: show related blocks here as well, I guess
                var guesses = _.chain(pouch.getUserGuesses()).pairs().map(function createFakeSolrDoc(pair){
                    var guessId = pair[0];
                    var guessValue = pair[1];

                    var valueForSorting;

                    var isRelated = guessId.indexOf('~') !== -1;
                    if (isRelated) { // related block
                        valueForSorting = _.map(guessId.split('~'), function(n){ return parseInt(n, 10);});
                    } else {
                        valueForSorting = [parseInt(guessId, 10)];
                    }

                    // fake a solr doc here
                    return {
                        id : guessId,
                        valueForSorting : valueForSorting,
                        docType : (isRelated ? 'related' : 'summary'),
                        guessValue : guessValue
                    };
                }).filter(function guessIsNonEmpty(doc){return doc.guessValue;}).value();

                guesses.sort(function(left, right){
                    // sort normally, lexicographically
                    var leftVal = left.valueForSorting;
                    var rightVal = right.valueForSorting;
                    if (leftVal[0] === rightVal[0]) {
                        return (leftVal.length < 2 ? -1 : leftVal[1]) - (rightVal.length < 2 ? -1 : rightVal[1]);
                    }
                    return leftVal[0] - rightVal[0];
                });

                // fake a response from solr
                intermediateResults.numFound = guesses.length;

                intermediateResults.solrDocs = guesses;

                performCouchSummariesSearch();

            }


            if (!$scope.initialLoadComplete) {
                $scope.searchInProgress = true;

                if ($scope.myGuessesMode) {

                    pouch.addOnGuessesReadyListener(function(){
                        loadMyGuesses();
                    });
                } else { // search mode
                    performSolrSearch();
                }
            }
        }]);