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
        keys : JSON.stringify([blockOrRelatedBlock._id]),
        include_docs : true
    };

    self.$http({method : 'GET', url : self.constants.couchdb.hints_url +'/_all_docs', params : params})
        .success(function(data){
            blockOrRelatedBlock.fetchingBlockHints = false;

            if (!data.rows) {
                return onError(data);
            }

            self.blocksService.updateHints([blockOrRelatedBlock], data.rows);
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

