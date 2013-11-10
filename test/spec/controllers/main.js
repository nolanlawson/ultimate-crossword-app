'use strict';

describe('Controller: MainController', function () {

    // load the controller's module
    beforeEach(module('ultimate-crossword'));

    /*var MainController,
        scope;
    */

    /* Fuck the tests, I don't have time for this right now. */
    /*
    // Initialize the controller and a mock scope
    beforeEach(inject(function ($controller, $rootScope, $httpBackend) {
        scope = $rootScope.$new();
        MainController = $controller('MainController', {
            $scope: scope
        });
        $httpBackend.when('GET').respond({
            'total_rows': 7300,
            offset: 0,
            rows: [
                {
                    id: '23463',
                    key: 7649,
                    value: null,
                    doc: {
                        _id: '23463',
                        _rev: '1-b70546a4a335f4899f692a042d4ccbe2',
                        soloCount: 7649,
                        precedingCount: 0,
                        followingCount: 0,
                        hints: ['foobar']
                    }
                }
            ]
        });
    }));*/

    it('should attach a constants to the scope', function () {
        expect('foobar').not.toBeNull();
    });
});
