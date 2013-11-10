'use strict';

angular.module('ultimate-crossword')
    .controller('SearchController', ['$scope', '$route', 'blocks', '$http', 'constants', 'search',
        function ($scope, $route, blocksService, $http, constants, searchService) {

            $scope.q = decodeURIComponent($route.current.params.q);
            $scope.blocksService = blocksService;

            // ensure that the search text appears in the search box
            searchService.q = $scope.q;

            var intermediateResults = {};

            function onError(data) {
                // TODO: do something useful
                console.log('got an error: ' + data);
            }

            function addCheapHighlighting(rows) {
                // Do cheap, regex-based highlighting because Solr's highlighting feature would be overkill
                // (too much bandwidth used, have to store hints, have to merge them, etc.)

                // thanks mozilla:
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?
                // redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions
                function escapeRegExp(string){
                    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
                }

                var regex = new RegExp('\\b(' + escapeRegExp($scope.q) + ')\\b');

                _.forEach(rows, function(row){
                    var counter = 0;

                    var highlightedHintMap = _.object(_.chain(_.pairs(row.doc.hintMap)
                    ).map(function(pair){
                            var hint = pair[0];
                            var count = pair[1];

                            var highlightedHint = hint.replace(regex, '<strong>$1</strong>');
                            console.log(highlightedHint);

                            if (highlightedHint !== hint) { // highlighted
                                return [true, count, highlightedHint]; // sort highlighted ones first
                            }

                            return [false, count, hint];
                        }
                    ).sort().map(function(arr){
                        // fudge the count so that they're sorted correctly
                        return [arr[2], counter++];
                    }).value());

                    row.doc.hintMap = highlightedHintMap;
                });
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

                    // create a neat search result object
                    var result = _.pick(block, 'joinedHints', 'shortJoinedHints');
                    result = _.extend(result, {
                        blockIds : (solrDoc.docType === 'related' ? block.ids : [solrDoc.id, '12345']),
                        count    : (solrDoc.docType === 'related' ? block.count : block.soloCount)
                    });

                    return _.extend(result, solrDoc);

                });

                $scope.results = results;
                $scope.doneLoading = true;

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

                        addCheapHighlighting(data.rows);

                        intermediateResults[(resultName)] = data.rows;

                        callback();
                    })
                    .error(onError)
                ;
            }

            function performCouchHintsSearch(keys) {
                var params = {
                    keys : JSON.stringify(keys),
                    include_docs : true
                };

                $http({method : 'GET', url : constants.couchdb.hints_url +'/_all_docs', params : params})
                    .success(function(data){
                        if (!data.rows) {
                            return onError(data);
                        }
                        var blocksAndRelatedBlocks = _.flatten(
                            intermediateResults.couchRelatedBlocks,
                            intermediateResults.couchSummaries);

                        addCheapHighlighting(data.rows);

                        blocksService.updateHints(blocksAndRelatedBlocks, data.rows);

                        onSearchCompleted();
                    })
                    .error(onError);
            }

            function performCouchHintsSearchIfNecessary() {

                var keys = _.chain(_.flatten(intermediateResults.couchRelatedBlocks, intermediateResults.couchSummaries)).filter(function(blockOrRelatedBlock){
                    return blockOrRelatedBlock.hintsRedacted;
                }).pluck('_id').value();

                if (keys.length) {
                    performCouchHintsSearch(keys);
                } else {
                    // no hints were redacted; nothing to do
                    onSearchCompleted();
                }


            }
            function performCouchRelatedBlocksSearch() {
                performGenericCouchSearch('related', constants.couchdb.related_url, 'couchRelatedBlocks', performCouchHintsSearchIfNecessary);
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
                    // roughly, docs with count >10 start to "look" more important
                    boost      : 'exp(div(popularity,10))',
                    wt         : 'json',
                    indent     : 'off',
                    omitHeader : true,
                    mm         : '100%',
                    rows       : 999999
                };
                $http({method: 'GET', url: constants.solr_url + '/select/', params: params})
                    .success(function (data) {
                        if (!(data.response && data.response.docs)) {
                            return onError(data);
                        }
                        intermediateResults.solrDocs = data.response.docs;

                        performCouchSummariesSearch();

                    })
                    .error(onError);
            }

            if (!$scope.results) {
                performSolrSearch();
            }



        }]);