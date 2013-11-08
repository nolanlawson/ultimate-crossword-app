'use strict';
/**
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 *
 * Shared singleton that represents "block" data we've fetched from CouchDB.
 *
 */

var MAX_HINTS_LENGTH = 40;

function BlocksService() {

    this.currentPage = [];
    this.previousPages = [];
    this.nextPages = [];

}

function joinHints(hints) {
    return (hints.length) ? _(hints).join(',') : '(No hints)';
}

function ellipsize(str, toLen) {
    if (str.length > toLen) {
        return str.substring(0, toLen - 1) + "\u2026";
    }
    return str;
}

function transformOtherBlocks(otherBlocks) {

    return _(_.pairs(otherBlocks)).map(function(pair) {
        var id = pair[0];
        var hints = pair[1];
        var joinedHints = joinHints(hints);
        return {
            _id              : id,
            hints            : hints,
            joinedHints      : joinedHints,
            shortJoinedHints : ellipsize(joinedHints, MAX_HINTS_LENGTH),
            count            : hints.length

        };
    });
}

BlocksService.prototype.loadPage = function (rows) {

    this.currentPage = _(rows).map(function(row){
        var block = _({count : row.key}).extend(_.pick(row.doc, '_id', 'hints'));

        block.joinedHints = joinHints(block.hints);
        block.shortJoinedHints = ellipsize(block.joinedHints, MAX_HINTS_LENGTH);
        block.precedingBlocks = transformOtherBlocks(row.doc.preceding_blocks);
        block.followingBlocks = transformOtherBlocks(row.doc.following_blocks);

        return block;
    });
};

angular.module('ultimate-crossword').service('blocks', [ BlocksService]);