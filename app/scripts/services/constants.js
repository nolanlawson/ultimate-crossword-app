'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function ConstantsService() {

    this.maxNumRelated = 5;
    this.pageSize = 10;
    this.numColors = 16;
    this.pouchRefreshTimeout = 3000;
    this.searchPageSize = 5;
    this.saveDelay = 1500;
    this.hintsPageSize = 500;
    this.hintThreshold = 30; // defined in python when we compiled the db
    this.blockIdRange = [1, 700502]; // inclusive,exclusive

    _.extend(this, AppConfig);
}

angular.module('ultimate-crossword').service('constants', [ConstantsService]);