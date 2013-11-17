'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function PouchService(constants, $rootScope, $window, $cookieStore) {
    var self = this;

    self.constants = constants;
    self.doc = {guesses : {}};
    self.lastDocFromDb = {guesses : {}};
    self.$rootScope = $rootScope;
    self.syncWithPouchInProgress = false;


    $window.onbeforeunload = function() {
        if (self.isDirty()) {
            self.updateGuesses();
            return 'You have unsaved changes! Just stay on this page for 3 more seconds and we\'ll save \'em. :)';
        }
    };

    // supports existing users, back before we disabled syncing user data with the remote CouchDB
    self.createOrLoadDb($cookieStore.get('username') || 'user');
}

PouchService.prototype.addOnGuessesReadyListener = function(callback){
    var self = this;

    if (self.dbReady) {
        if (self.isDirty()) {
            // wait until guesses have been flushed
            self.updateGuesses(callback);
        } else {
            callback();
        }
    } else {
        self.onDbReadyListener = callback;
    }
};

PouchService.prototype.notifyShouldUpdate = function(){
    var self = this;

    if (!self.dbReady) {
        return;
    }

    if (self.lastTimeout) {
        clearTimeout(self.lastTimeout);
    }

    self.lastTimeout = setTimeout(function() {
        self.updateGuesses();
    }, self.constants.pouchRefreshTimeout);
};

PouchService.prototype.debug = function(str){
    var self = this;

    if (self.constants.debug_mode) {
        console.log(str);
    }
};

PouchService.prototype.isDirty = function() {
    var self = this;

    return !_.isEqual(self.lastDocFromDb, self.doc);
};

PouchService.prototype.onBeginSync = function() {
    var self = this;
    self.$rootScope.$apply(function(){
        self.syncWithPouchInProgress = true;
    });
    self.debug('begin sync');
};

PouchService.prototype.onEndSync = function() {
    var self = this;
    self.debug('end sync without updating UI');
    // set this with a delay; otherwise it happens so fast that the user doesn't see any text
    setTimeout(function() {
        self.$rootScope.$apply(function(){
            self.syncWithPouchInProgress = false;
            self.debug('end sync, updated UI');
        });
    }, self.constants.saveDelay);
};

PouchService.prototype.updateGuesses = function(callback) {
    var self = this;
    if (!self.dbReady) {
        self.debug('db is not ready');
        return;
    } else if (self.syncWithPouchInProgress) {
        self.debug('sync with pouch already in progress');
        return;
    } else if (!self.isDirty()) {
        self.debug('I am not dirty, no reason to update');
        return;
    }

    self.debug('my doc is ' + JSON.stringify(self.doc));
    var newDoc = _.clone(self.doc);
    self.onBeginSync();

    self.db.get(self.doc._id, function(err, doc){
        if (err || !doc) {
            self.debug('error: ' + JSON.stringify(err));
            self.onEndSync();
            return;
        }
        if (!_.isEqual(newDoc.guesses, doc.guesses)) {
            self.db.put(newDoc, function(err, response){
                self.debug('got err: ' + err);
                self.debug('got response: ' + JSON.stringify(response));
                if (response && response.ok) {
                    newDoc._rev = response.rev;

                    _.extend(self.doc, newDoc);
                    self.updateLastDocFromDb();
                    if (callback) {
                        callback();
                    }
                }

                self.onEndSync();

            });
        } else {
            self.onEndSync();
        }
    });

};

PouchService.prototype.updateLastDocFromDb = function() {
    var self = this;

    // underscore does only a shallow copy; not good enough
    self.lastDocFromDb = _.extend(_.clone(self.doc), {guesses : _.clone(self.doc.guesses)});
};

PouchService.prototype.createOrLoadDb = function(username) {
    var self = this;

    function onDbReady() {
        self.dbReady = true;
        if (self.onDbReadyListener) {
            self.onDbReadyListener();
        }
    }

    // single database, single document
    self.db = new PouchDB(username);

    self.db.get(username, function(err, doc){
        if (!doc) { //  new document
            self.doc._id = username;
            self.doc.guesses = self.doc.guesses || {};
            self.db.put(self.doc, function(err, response){
                if (response && response.ok) {
                    self.doc._rev = response.rev;
                    self.updateLastDocFromDb();
                    self.debug('new doc: ' + JSON.stringify(self.doc));
                    onDbReady();
                }
            });

        } else { // existing document
            self.debug('doc exists: ' + JSON.stringify(doc));
            _.extend(self.doc, doc);
            self.updateLastDocFromDb();

            onDbReady();
        }
    });
};

PouchService.prototype.getUserGuesses = function() {
    var self = this;

    if (!self.dbReady || !self.lastDocFromDb) {
        return {};
    }
    return self.lastDocFromDb.guesses;
};

angular.module('ultimate-crossword').service('pouch', ['constants', '$rootScope', '$window', '$cookieStore', PouchService]);
