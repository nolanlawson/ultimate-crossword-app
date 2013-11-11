'use strict';
/**
 * Created with JetBrains WebStorm.
 * User: nolan
 * Date: 11/6/13
 * Time: 11:08 PM
 * To change this template use File | Settings | File Templates.
 */
function PouchService(constants, $rootScope) {
    var self = this;

    self.constants = constants;
    self.doc = {guesses : {}};
    self.$rootScope = $rootScope;
}

PouchService.prototype.updateGuesses = function() {
    var self = this;
    if (!self.dbReady) {
        console.log('db is not ready');
        return;
    } else if (self.syncWithPouchInProgress) {
        console.log('sync with pouch already in progress');
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
                } else {
                    self.syncWithPouchInProgress = false;
                }
            });
        } else {
            self.syncWithPouchInProgress = false;
        }
    });

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
        self.db.replicate.to(self.constants.couchdb.userdocs_url, {continuous : true});
        self.db.replicate.from(self.constants.couchdb.userdocs_url, {
            continuous : true,
            filter : function(doc) {
                return doc._id === username; // don't sync everybody and their grandma's databases
            }
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
                    console.log('new doc: ' + JSON.stringify(self.doc));
                    onDbReady();
                }
            });

        } else { // existing document
            console.log('doc exists: ' + JSON.stringify(doc));
            _.extend(self.doc, doc);

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

angular.module('ultimate-crossword').service('pouch', ['constants', '$rootScope', PouchService]);