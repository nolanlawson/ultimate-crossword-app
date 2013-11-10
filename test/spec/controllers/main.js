'use strict';

describe('Controller: MainController', function () {

    // load the controller's module
    beforeEach(module('ultimate-crossword'));

    var MainController,
        scope;

    // Initialize the controller and a mock scope
    beforeEach(inject(function ($controller, $rootScope) {
        scope = $rootScope.$new();
        MainController = $controller('MainController', {
            $scope: scope
        });
    }));

    // TODO: add tests; too lazy right now
    it('should attach constants to the scope', function () {
        expect(scope.constants).not.toBeNull();
    });
});
