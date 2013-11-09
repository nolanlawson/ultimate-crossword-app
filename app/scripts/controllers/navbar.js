'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module('ultimate-crossword').controller('NavbarController', [ '$scope', '$location',
    function($scope, $location) {

        $scope.$parent.q = '';

        $scope.performSearch = function() {

            var blockId = parseInt($scope.$parent.q, 10);

            // for now, only accept block ids
            if (!isNaN(blockId)) {
                window.location = '#/' + blockId;
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
            new Tab('home', 'Home'),
            new Tab('faq', 'FAQs'),
            new Tab('about', 'About')
        ];

        var selectedTab = _.find($scope.tabs, function(tab){
            return $location.path() === '/' + tab.id;
        });
        $scope.selectedTabId = selectedTab ? selectedTab.id : 'home';

    }]
);