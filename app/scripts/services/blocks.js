'use strict';
/**
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 *
 * Shared singleton that represents "block" data we've fetched from CouchDB.
 *
 */
function BlocksService() {

    this.currentPage = [];
    this.previousPages = [];
    this.nextPages = [];

}

function transformOtherBlocks(otherBlocks) {
    return _(_.pairs(otherBlocks)).map(function(pair) {
        var id = pair[0];
        var hints = pair[1];
        return {
            _id         : id,
            hints       : hints,
            joinedHints : _(hints).join(', ')
        };
    });
}

BlocksService.prototype.loadPage = function (rows) {

    this.currentPage = _(rows).map(function(row){
        var block = _({count : row.key}).extend(_.pick(row.doc, '_id', 'hints'));

        block.joinedHints = _(block.hints).join(', ');
        block.precedingBlocks = transformOtherBlocks(row.doc.preceding_blocks);
        block.followingBlocks = transformOtherBlocks(row.doc.following_blocks);

        return block;
    });
};

angular.module('ultimate-crossword').service('blocks', [ BlocksService]);