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
        blocks_url : 'http://localhost:5984/block_summaries2',
        details_url : 'http://localhost:5984/related_blocks2'
    };
    this.solr_url = 'http://localhost:8983/solr';
    this.maxNumRelated = 20;
    this.pageSize = 10;
    this.numColors = 16;
}

angular.module('ultimate-crossword').service('constants', [ConstantsService]);