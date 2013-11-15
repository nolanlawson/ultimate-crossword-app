'use strict';
/**
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 *
 * Shared singleton that represents "block" data we've fetched from CouchDB.
 *
 */

var MAX_HINTS_LENGTH = 45;

function BlocksService(constants) {

    this.currentPage = [];
    this.constants = constants;
}

function joinHints(hints, hasMore) {
    // used for the visibile text in the Hints column
    var result = (hints.length) ? _(hints).join(', ') : '(No hints)';
    return result + (hasMore ? '<br/>(Click the block for more hints)' : '');
}

function joinHintsEllipsized(hints) {
    // used for the tooltip text
    var result = '';
    for (var i = 0, len = hints.length; i < len; i++) {

        var hint = hints[i];
        if (hint.length + result.length > MAX_HINTS_LENGTH) { // too long
            return result + '\u2026';
        } else { // still short enough
            if (i > 0) {
                result += ', ';
            }
            result +=  hint;
        }
    }
    return result;
}

function sortByValuesDescKeysAsc(obj) {
    var result = [];
    var countsToHints = {};
    // eschew underscore because this function is expensive!
    for (var hint in obj) {
        if (obj.hasOwnProperty(hint)) {
            var count1 = obj[hint];

            var existingList = countsToHints[count1];
            if (existingList) {
                existingList.push(hint);
            } else { // new list
                countsToHints[count1] = [hint];
            }
        }
    }
    var sortedCounts = _.keys(countsToHints);
    sortedCounts.sort(function compareNumbers(a, b){return a - b;});
    sortedCounts.reverse();
    for (var i = 0, len1 = sortedCounts.length; i < len1; i++) {
        var count2 = sortedCounts[i];
        var hints = countsToHints[count2];
        hints.sort();

        for (var j = 0, len2 = hints.length; j < len2; j++) {
            result.push([hints[j], count2]);
        }

        // XXX: hack to save the browser if the user picks a block with thousands of hints
        // TODO: page through hints if there are too many
        if (result.length > 2000) {
            result.push(['(List truncated due to enormity)', 0]);
            break;
        }

    }
    return result;

}

BlocksService.prototype.applyHints = function(blockOrRelatedBlock, hintMap) {

    var hintsWithCounts = sortByValuesDescKeysAsc(hintMap);

    blockOrRelatedBlock.hintsWithCounts = hintsWithCounts;
    blockOrRelatedBlock.hints = _.map(hintsWithCounts, function(pair){return pair[0];});

    blockOrRelatedBlock.joinedHints = joinHints(blockOrRelatedBlock.hints, blockOrRelatedBlock.hintsRedacted);
    blockOrRelatedBlock.shortJoinedHints = joinHintsEllipsized(blockOrRelatedBlock.hints);
};

BlocksService.prototype.transformRelatedBlocks = function (rows, sourceBlockId) {
    var self = this;

    return _.map(rows, function (row) {

        var otherId = row.doc.block.toString();
        var blockIds = row.doc.preceding ? [otherId, sourceBlockId] : [sourceBlockId, otherId];

        var result = {
            _id : row.doc._id,
            ids: blockIds,
            preceding: row.doc.preceding,
            count : row.doc.count,
            hintsRedacted: row.doc.hintsRedacted,
            hintsRedactedUnique : row.doc.hintsRedactedUnique
        };

        self.applyHints(result, row.doc.hintMap);

        return result;
    });
};

BlocksService.prototype.loadRelated = function (block, rows) {

    var relatedBlocks = this.transformRelatedBlocks(rows, block._id);

    block.relatedBlocks = (block.relatedBlocks || []).concat(relatedBlocks);
};

BlocksService.prototype.transformRowsIntoBlocks = function (rows) {
    var self = this;
    return _.map(rows, function (row) {
        var block = _.pick(row.doc, '_id', 'soloHintCount',
            'followingHintCount', 'precedingHintCount', 'followingBlockCount',
            'precedingBlockCount', 'hintsRedacted','hintsRedactedUnique');

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

    var idsToHints = _.object(_.map(rows, function(row){return [row.key, row.doc];}));

    blocksOrRelatedBlocks.forEach(function(blockOrRelatedBlock){
        if (blockOrRelatedBlock.hintsRedacted && idsToHints[blockOrRelatedBlock._id]) {
            var fullHints = idsToHints[blockOrRelatedBlock._id].hintMap;
            self.applyHints(blockOrRelatedBlock, fullHints);
        }
    });
};

angular.module('ultimate-crossword').service('blocks', [ 'constants', BlocksService]);
