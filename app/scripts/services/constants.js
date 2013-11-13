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
    this.pouchRefreshInterval = 20000;
    this.searchPageSize = 5;

    _.extend(this, AppConfig);
}

angular.module('ultimate-crossword').service('constants', [ConstantsService]);