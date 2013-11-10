/*
 * Keeps track of the session that the user is in (i.e. logged in, logged out)
 */
'use strict';

function SessionService(constants, $cookieStore, $http) {

    var self = this;

    self.$cookieStore = $cookieStore;
    self.lastUsername = $cookieStore.get('username');
    self.$http = $http;
    self.constants = constants;

    function checkLoggedIn() {

        $http({method: 'GET', url: constants.couchdb.session_url})
            .success(function (data) {
                if (data.ok && data.userCtx && data.userCtx.name) {
                    // server sez we're logged in
                    self.login(data.userCtx.name);
                } else {
                    // server sez we got logged out!
                    self.loggedIn = false;
                }
            })
            .error(function (err) {
                console.log('error: ' + err);
            });
    }

    checkLoggedIn();
}

SessionService.prototype.login = function (username) {
    this.loggedIn = true;
    this.username = username;
    this.$cookieStore.put('username', username); // save the last username for quicker sign-in later
    this.lastUsername = username;
};

SessionService.prototype.logout = function () {
    var self = this;

    function logoutError(data) {
        // TODO: we failed to logout... what to do?
        console.log(JSON.stringify(data));
    }

    self.$http({method: 'DELETE', url: self.constants.couchdb.session_url})
        .success(function (data) {
            if (data.ok) {
                self.loggedIn = false;
            } else {
                logoutError(data);
            }
        }).error(logoutError);
};


angular.module('ultimate-crossword').service('session', ['constants', '$cookieStore', '$http',
    SessionService]);