'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module('ultimate-crossword').controller('NavbarController', [ '$scope', '$location', 'search', 'pouch',
    function($scope, $location, searchService, pouch) {

        $scope.searchService = searchService;
        $scope.pouch = pouch;

        $scope.performSearch = function() {

            var q = $scope.searchService.q;
            var qAsInt = parseInt(q, 10);

            // for now, only accept block ids
            if (!isNaN(qAsInt)) {
                $location.path('/block/' + qAsInt);
            } else if (q) {
                // perform search
                $location.path('/search/' + encodeURIComponent(q));
            }
        };

        function Tab(id, title) {
            this.id = id;
            this.title = title;
        }

        Tab.prototype.getHref = function(){
            return '#/' + (this.id === 'home' ? '' : this.id);
        };



        $scope.tabs = [
            new Tab('home', 'Top'),
            new Tab('random', 'Random!'),
            new Tab('myguesses', 'My guesses'),
            new Tab('faq', 'FAQs'),
            new Tab('about', 'About')
        ];

        if (new RegExp('^/(?:search|block)/').exec($location.path())) { // tabless page, no need to highlight
            $scope.selectedTabId = null;
        } else { // figure out which one to highlight
            var selectedTab = _.find($scope.tabs, function(tab){
                return $location.path() === '/' + tab.id;
            });
            $scope.selectedTabId = selectedTab ? selectedTab.id : 'home';
        }

    }]
);