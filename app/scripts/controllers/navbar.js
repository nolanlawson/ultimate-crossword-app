/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module('ultimate-crossword').controller('NavbarController', [ '$scope', '$location',
    function($scope, $location) {

        function Tab(id, title) {
            this.id = id;
            this.title = title;
        }

        Tab.prototype.getHref = function(){
            return '#/' + (this.id == 'home' ? '' : this.id);
        };

        $scope.tabs = [
            new Tab('home', 'Home'),
            new Tab('about', 'About')
        ];
        $scope.selectedTabId = $location.path() === '/about' ? 'about' : 'home';

    }]
);