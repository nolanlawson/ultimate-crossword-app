'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function PouchService(constants, $rootScope, $window) {
    var self = this;

    self.constants = constants;
    self.doc = {guesses : {}};
    self.lastDocFromDb = {guesses : {}};
    self.$rootScope = $rootScope;
    self.syncWithPouchInProgress = false;


    $window.onbeforeunload = function() {
        if (self.isDirty()) {
            self.updateGuesses();
            return self.dbReady ? 'You have unsaved changes.' : 'You have unsaved changes.  You need to sign in to save them!';
        }
    };
}

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

PouchService.prototype.updateGuesses = function() {
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

        self.lastInterval = setInterval(function(){
            self.updateGuesses();
        }, self.constants.pouchRefreshInterval);
        self.$rootScope.$apply(); // update angular display

        // replication to remote CouchDB
        self.db.replicate.to(self.constants.couchdb.users_db_url + '/user_docs', {continuous : true});
        self.db.replicate.from(self.constants.couchdb.users_db_url + '/user_docs', {
            continuous : true,
            filter : 'app/by_user'
        });
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

PouchService.prototype.onLogOut = function() {
    var self = this;
    self.doc = {guesses : {}};
    self.lastDocFromDb = {guesses : {}};
    if (self.lastInterval) {
        clearInterval(self.lastInterval);
    }
    self.dbReady = false;
};

angular.module('ultimate-crossword').service('pouch', ['constants', '$rootScope', '$window', PouchService]);
