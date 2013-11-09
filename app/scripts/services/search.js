'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function SearchService() {

    this.q = '';
}

angular.module('ultimate-crossword').service('search', [SearchService]);