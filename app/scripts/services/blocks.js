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

function transformrelatedBlocks(rows, sourceBlockId) {

    return _.map(rows, function(row) {

        var otherId = row.doc.block.toString();
        var hints = row.doc.hints;
        var joinedHints = joinHints(hints);
        var preceding = row.doc.preceding;
        var blockIds = preceding ? [otherId, sourceBlockId] : [sourceBlockId, otherId];

        return {
            ids              : blockIds,
            hints            : hints,
            joinedHints      : joinedHints,
            shortJoinedHints : ellipsize(joinedHints, MAX_HINTS_LENGTH),
            count            : hints.length,
            preceding        : preceding
        };
    });
}

BlocksService.prototype.loadRelated = function(block, rows) {

    var relatedBlocks = transformrelatedBlocks(rows, block._id);

    block.relatedBlocks = relatedBlocks;
};

BlocksService.prototype.loadPage = function (rows) {

    this.currentPage = this.currentPage.concat(_(rows).map(function(row){
        var block = _({count : row.key}).extend(_.pick(row.doc, '_id', 'hints', 'numRelated'));

        block.joinedHints = joinHints(block.hints);
        block.shortJoinedHints = ellipsize(block.joinedHints, MAX_HINTS_LENGTH);
        block.relatedBlocks = [];

        return block;
    }));
};

angular.module('ultimate-crossword').service('blocks', [ BlocksService]);