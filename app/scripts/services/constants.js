'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function ConstantsService() {

    this.couchdb = {
        blocks_url : 'http://koholint-wired:5985/block_summaries',
        details_url : 'http://koholint-wired:5985/related_blocks'
    };
    this.maxNumRelated = 20;
    this.pageSize = 10;
    this.numColors = 16;
}

angular.module('ultimate-crossword').service('constants', [ConstantsService]);