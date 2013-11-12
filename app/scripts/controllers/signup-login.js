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
        var MIN_USERNAME = 3;

        function validateFormAndReturnWarning() {
            // verify length and shit.  We don't have to do an excellent job, because
            // CouchDB will reject users for way more spurious reasons.
            if (!$scope.alreadyHaveAccount) {
                // signing up

                if ($scope.password) {
                    if ($scope.password.length < MIN_PASSWORD || $scope.password.length > MAX_PASSWORD) {
                        return {
                            password : true,
                            text : 'Password must be between ' + MIN_PASSWORD + ' and ' + MAX_PASSWORD + ' characters.'
                        };
                    }
                    if ($scope.confirmPassword && $scope.password !== $scope.confirmPassword) {
                        return {
                            password : true,
                            text : 'Passwords must match.'
                        };
                    }
                }
                if ($scope.username) {
                    if ($scope.username.length < MIN_USERNAME || $scope.username.length > MAX_USERNAME) {
                        return {
                            username : true,
                            text : 'Username must be between ' + MIN_USERNAME + ' and ' + MAX_USERNAME + '  characters.'
                        };
                    }
                }
            } // else logging in; show no errors until the users have pressed the submit button
            return null;
        }


        function validateForm() {
            $scope.warning = validateFormAndReturnWarning();
        }

        $scope.$watch('username + password + confirmPassword + alreadyHaveAccount', validateForm);

        function onError(data) {
            var warning = { text : (data.reason || 'Unknown error')};

            if (warning.text === 'Document update conflict.') { // unhelpful error message from CouchDB
                warning.text = 'Bummer, someone already took that user name! Please try another.';
                warning.username = true;
            }

            if (data.error === 'not_found' && data.reason === 'missing') {
                warning.text = 'You are already logged in.';
            }

            $scope.warning = warning;
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
            $http({method: 'POST', url: constants.couchdb.users_db_url + '/_session', data: data})
                .success(onSuccess)
                .error(onError);
        }

        function signup() {

            var data = {
                name: $scope.username,
                password: $scope.password,
                roles: [],
                type: 'user',
                _id: ('org.couchdb.user:' + $scope.username)
            };
            var userUrl = constants.couchdb.users_db_url + '/_users/org.couchdb.user%3A' + $scope.username;
            $http({method: 'PUT', url: userUrl, data: data})
                .success(onSuccess)
                .error(onError);
        }

        $scope.submit = function () {

            if (!$scope.password || !$scope.username || $scope.warning) {
                return;
            }

            if ($scope.alreadyHaveAccount) {
                login();
            } else {
                signup();
            }
        };

    }]);