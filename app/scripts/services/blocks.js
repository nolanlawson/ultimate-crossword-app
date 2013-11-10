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

function BlocksService(constants) {

    this.currentPage = [];
    this.constants = constants;
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

function sortByValuesDesc(obj) {
    return _.chain(_.pairs(obj)).sortBy(
        function (pair) {
            return pair[1];
        }
    ).reverse().map(
        function (pair) {
            return pair[0];
        }
    ).value();
}

BlocksService.prototype.applyHints = function(blockOrRelatedBlock, hintMap) {

    blockOrRelatedBlock.hints = sortByValuesDesc(hintMap);
    blockOrRelatedBlock.joinedHints = joinHints(blockOrRelatedBlock.hints);
    blockOrRelatedBlock.shortJoinedHints = ellipsize(blockOrRelatedBlock.joinedHints, MAX_HINTS_LENGTH);
};

BlocksService.prototype.transformRelatedBlocks = function (rows, sourceBlockId) {
    var self = this;

    return _.map(rows, function (row) {

        var otherId = row.doc.block.toString();
        var blockIds = row.doc.preceding ? [otherId, sourceBlockId] : [sourceBlockId, otherId];

        var result = {
            ids: blockIds,
            preceding: row.doc.preceding,
            count : row.doc.count,
            hintsRedacted: row.doc.hintsRedacted
        };

        self.applyHints(result, row.doc.hintMap);

        return result;
    });
};

BlocksService.prototype.loadRelated = function (block, rows) {

    var relatedBlocks = this.transformRelatedBlocks(rows, block._id);

    block.relatedBlocks = relatedBlocks;
};

BlocksService.prototype.transformRowsIntoBlocks = function (rows) {
    var self = this;
    return _.map(rows, function (row) {
        var block = _.pick(row.doc, '_id', 'soloCount', 'followingCount', 'precedingCount', 'hintsRedacted');

        self.applyHints(block, row.doc.hintMap);
        block.relatedBlocks = [];

        return block;
    });
};

BlocksService.prototype.loadPage = function (rows) {

    this.currentPage = this.currentPage.concat(this.transformRowsIntoBlocks(rows));
};

BlocksService.prototype.getLabelClass = function (blockId) {
    return 'label-' + (parseInt(blockId, 10) % this.constants.numColors);
};

BlocksService.prototype.updateHints = function(blocksOrRelatedBlocks, rows) {
    var self = this;
    // update a list of blocks or related blocks with the full hints fetched from the block_hints database

    var idsToHints = _.object(_.map(rows, function(row){return [row._id, row.doc];}));

    blocksOrRelatedBlocks.forEach(function(blockOrRelatedBlock){
        if (blockOrRelatedBlock.hintsRedacted && idsToHints[blockOrRelatedBlock._id]) {
            var fullHints = idsToHints[blockOrRelatedBlock._id].hintMap;
            self.applyHints(blockOrRelatedBlock, fullHints);
        }
    });
};

angular.module('ultimate-crossword').service('blocks', [ 'constants', BlocksService]);