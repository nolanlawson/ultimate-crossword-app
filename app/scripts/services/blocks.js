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

}

function joinHints(hints) {
    return (hints.length) ? _(hints).join(',') : '(No hints)';
}

function ellipsize(str, toLen) {
    if (str.length > toLen) {
        return str.substring(0, toLen - 1) + '\u2026';
    }
    return str;
}

function transformOtherBlocks(otherBlocks, sourceBlockId, following) {

    return _(_.pairs(otherBlocks)).map(function(pair) {
        var otherId = pair[0];
        var hints = pair[1];
        var joinedHints = joinHints(hints);
        var blockIds = following ? [sourceBlockId, otherId] : [otherId, sourceBlockId];
        return {
            ids              : blockIds,
            hints            : hints,
            joinedHints      : joinedHints,
            shortJoinedHints : ellipsize(joinedHints, MAX_HINTS_LENGTH),
            count            : hints.length,
            following        : following

        };
    });
}

BlocksService.prototype.loadPage = function (rows) {

    this.currentPage = this.currentPage.concat(_(rows).map(function(row){
        var block = _({count : row.key}).extend(_.pick(row.doc, '_id', 'hints'));

        block.joinedHints = joinHints(block.hints);
        block.shortJoinedHints = ellipsize(block.joinedHints, MAX_HINTS_LENGTH);
        block.otherBlocks = transformOtherBlocks(row.doc.preceding_blocks, block._id, false)
            .concat(transformOtherBlocks(row.doc.following_blocks, block._id, true));

        return block;
    }));
};

angular.module('ultimate-crossword').service('blocks', [ BlocksService]);