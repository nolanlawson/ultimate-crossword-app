'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
angular.module('ultimate-crossword').controller('SignupLoginController', [ '$scope', '$http', 'constants', 'session',
    '$cookieStore',
    function ($scope, $http, constants, session, $cookieStore) {

        // check the box for returning users
        $scope.returningUser = $cookieStore.get('username');
        $scope.alreadyHaveAccount = $scope.returningUser && true;
        $scope.username = $scope.returningUser;

        var MAX_PASSWORD = 32;
        var MAX_USERNAME = 32;
        var MIN_PASSWORD = 8;
        var MIN_USERNAME = 5;

        function onError(data) {
            var reason = data.reason || 'Unknown error';
            if (reason === 'Document update conflict.') { // unhelpful error message from CouchDB
                reason = 'That user name is already taken.';
            }
            if (data.error === 'not_found' && data.reason === 'missing') {
                reason = 'You are already logged in.';
            }
            $scope.warning = reason;
            $scope.password = ''; // reset
            $scope.confirmPassword = ''; // reset

        }

        function onSuccess(data) {
            if (data.ok === true) {

                // response varies depending on whether it's signup or login
                if (data.id) { // signed up, still need to "log in" via a PUT
                    login();
                } else {
                    // else it was just a normal signup
                    $scope.warning = false;
                    $scope.hide(); // hide the modal
                    session.login(data.name);
                    $scope.password = ''; // reset
                    $scope.confirmPassword = ''; // reset
                }
            } else {
                onError(data);
            }
        }

        function login() {

            var data = {name: $scope.username, password: $scope.password};
            $http({method: 'POST', url: constants.couchdb.session_url, data: data})
                .success(onSuccess)
                .error(onError);
        }

        function signup() {

            if ($scope.password !== $scope.confirmPassword) {
                $scope.warning = 'Passwords must match.';
                return;
            }

            var data = {
                name: $scope.username,
                password: $scope.password,
                roles: [],
                type: 'user',
                _id: ('org.couchdb.user:' + $scope.username)
            };
            var userUrl = constants.couchdb.users_url + '/org.couchdb.user%3A' + $scope.username;
            $http({method: 'PUT', url: userUrl, data: data})
                .success(onSuccess)
                .error(onError);
        }

        $scope.submit = function () {

            // verify length and shit.  We don't have to do an excellent job, because
            // CouchDB will reject users for way more spurious reasons.
            if (!$scope.password || $scope.password.length < MIN_PASSWORD) {
                $scope.warning = 'Your password must be at least ' + MIN_PASSWORD + ' characters.';
                return;
            } else if ($scope.password.length > MAX_PASSWORD) {
                $scope.warning = 'Your password must be at most ' + MAX_PASSWORD + ' characters.';
                return;
            } else if (!$scope.username || $scope.username.length < MIN_USERNAME) {
                $scope.warning = 'Your username must be at least ' + MIN_USERNAME + '  characters';
                return;
            } else if ($scope.username.length > MAX_USERNAME) {
                $scope.warning = 'Your username must be at most ' + MAX_USERNAME + ' characters.';
                return;
            }

            if ($scope.alreadyHaveAccount) {
                login();
            } else {
                signup();
            }
        };

    }]);