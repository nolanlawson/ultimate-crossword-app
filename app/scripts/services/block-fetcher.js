'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function BlockFetcherService(constants, blocksService, $http) {
    this.constants = constants;
    this.blocksService = blocksService;
    this.$http = $http;
}

BlockFetcherService.prototype.fetchBlockHints = function (blockOrRelatedBlock, onError, onSuccess) {
    var self = this;

    blockOrRelatedBlock.fetchingBlockHints = true;

    var params = {
        // convention here is to separate with hyphens e.g. <id>-01, <id>-02, <id>-03, etc.
        endkey : JSON.stringify(blockOrRelatedBlock._id + '-Z'),
        include_docs : 'true'
    };

    if (blockOrRelatedBlock.fetchedBlockHints) {
        // not our first time fetching
        _.extend(params,{
            startkey : JSON.stringify(blockOrRelatedBlock.lastFetchedHintId),
            skip : 1,
            limit : self.constants.hintsPageSize
        });
    } else {
        // this is our first time fetching.  Since I didn't originally sort the hints in the block_summary the
        // same way that I'm sorting now, it's safer to just fetch the first 30 again
        _.extend(params, {
            startkey : JSON.stringify(blockOrRelatedBlock._id + '-'),
            limit : self.constants.hintsPageSize + blockOrRelatedBlock.hintsWithCounts.length
        });
    }

    var url = self.constants.couchdb.hints_url +'/_all_docs';
    self.$http({method : 'GET', url : url, params : params})
        .success(function(data){
            blockOrRelatedBlock.fetchingBlockHints = false;

            if (!data.rows) {
                return onError(data);
            }

            self.blocksService.updateHints(blockOrRelatedBlock, data.rows);
            blockOrRelatedBlock.fetchedBlockHints = true;
            if (onSuccess) {
                onSuccess();
            }
        })
        .error(function(data){
            blockOrRelatedBlock.fetchingBlockHints = false;
            onError(data);
        });
};

angular.module('ultimate-crossword').service('blockFetcher', ['constants', 'blocks', '$http', BlockFetcherService]);

