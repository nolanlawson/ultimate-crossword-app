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

    console.log($window);

    $window.onbeforeunload = function() {
        if (self.isDirty()) {
            self.updateGuesses();
            return self.dbReady ? 'You have unsaved changes.' : 'You have unsaved changes.  You need to sign in to save them!';
        }
    };
}

PouchService.prototype.isDirty = function() {
    var self = this;

    return !_.isEqual(self.lastDocFromDb, self.doc);
};

PouchService.prototype.updateGuesses = function() {
    var self = this;
    if (!self.dbReady) {
        console.log('db is not ready');
        return;
    } else if (self.syncWithPouchInProgress) {
        console.log('sync with pouch already in progress');
        return;
    } else if (!self.isDirty()) {
        console.log('I am not dirty, no reason to update');
        return;
    }
    self.syncWithPouchInProgress = true;

    console.log('my doc is ' + JSON.stringify(self.doc));
    var newDoc = _.clone(self.doc);

    self.db.get(self.doc._id, function(err, doc){
        if (err || !doc) {
            console.log('error: ' + JSON.stringify(err));
            self.syncWithPouchInProgress = false;
            return;
        }
        if (!_.isEqual(newDoc.guesses, doc.guesses)) {
            self.db.put(newDoc, function(err, response){
                console.log('got err: ' + err);
                console.log('got response: ' + JSON.stringify(response));
                if (response && response.ok) {
                    newDoc._rev = response.rev;

                    _.extend(self.doc, newDoc);
                    self.updateLastDocFromDb();
                }

                self.syncWithPouchInProgress = false;

            });
        } else {
            self.syncWithPouchInProgress = false;
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
                    console.log('new doc: ' + JSON.stringify(self.doc));
                    onDbReady();
                }
            });

        } else { // existing document
            console.log('doc exists: ' + JSON.stringify(doc));
            _.extend(self.doc, doc);
            self.updateLastDocFromDb();

            onDbReady();
        }
    });
};

PouchService.prototype.onLogOut = function() {
    var self = this;
    _.extend(self.doc, {_id : null, guesses : {}, _rev : null});
    if (self.lastInterval) {
        clearInterval(self.lastInterval);
    }
    self.dbReady = false;
};

angular.module('ultimate-crossword').service('pouch', ['constants', '$rootScope', '$window', PouchService]);
