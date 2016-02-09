'use strict';

// The google world map measures:
// 1. East to West with 360 degrees and 40,000Km
// 2. North to South with 180 degrees and 12,400km

// Our world grid will be in squares of 2km, thus
// we are using the following formulas to translate the google coordinates into our grid location

// (360deg / 40,000km) * 2km = 0.018 degrees (East/West)
// (180 deg / 20,000km) * 2km = 0.018 degrees (North/South)

// Thus every 0.018 degrees in the east/west direction and
// every 0.029 degrees in north/south direction will represent one grid square of our world grid
var stepX = 0.018;
var stepY = 0.018;

var exports = {};
module.exports = exports;

// Function to translate x,y coordinates (from Google maps) into the coordinate of a World grid square
exports.computeGridNumbers = function (coordinates) {
  var x = coordinates[0];
  var y = coordinates[1];

  return [

    //Coordinates divided by our step size gives the x and y value our the world grid square
    //Note we use math.ceil to round up (all grid squares are integers, 1, 2, 3, NOT 1.22)
    Math.ceil(x / stepX),
    Math.ceil(y / stepY),

  ];

};

// Adds an object to the table, if it doesn't already exist in that table
exports.createIfNotExists = function (obj) {
  /*
  obj = {
   table: Author [bookshelf model],
   attrs:{name:"ted"}
  }
  */

  return obj.table.where(obj.attrs).fetch()
  .then(function (model) {
   if (model) {
     // already exists, return true and the existing model
     //console.log('already have', JSON.stringify(obj.attrs), 'in', obj.table);
     return { alreadyExists:true, model:model };
   }

   // does not exists, so create it and save it, and return false
   //console.log('creating new ', JSON.stringify(obj.attrs), 'in', obj.table);
   return new obj.table(obj.attrs).save().then(function (model) {
     return { alreadyExists:false, model:model };
   });
 });
};

//helper function that makes sure the two objects are present in the tables specified
//then joins them based on their ids in the join table
exports.saveAndJoin = function (obj1, obj2, joinMethodNameForObj2) {
  // joinObj  = zones.model.worldGrid()

  // joinObj  = zones.model['worldGrid']()
  // joinObj  = zones.model[joinMethodName]()

  /*
  obj1 = {
   table: Author [bookshelf model],
   attrs:{name:"ted"}
  }
  obj2 = {
   table: Book [bookshelf model],
   attrs:{name:"Jack Jill"}
  }

  */
  var tempObj1Result;

  var firstAlreadyExisted = false;
  var secondAlreadyExisted = false;

  return exports.createIfNotExists(obj1)  // Function defined above
  .then(function (obj1Result) {
    if (obj1Result.exists) { firstAlreadyExisted = true; }

    tempObj1Result = obj1Result.model;
    return exports.createIfNotExists(obj2);
  })
  .then(function (obj2Result) {
    if (obj2Result.exists) { secondAlreadyExisted = true; }

    if (!firstAlreadyExisted || !secondAlreadyExisted) {  // Either one didn't already exist
      obj2Result.model[joinMethodNameForObj2]().attach(tempObj1Result); // Join them in the join table
    }
  });

};

// This function uses the saveAndJoin function, to join the array of obj1, PermitZone tuples
//joinMethodName is a property on the Bookshelf model. For example, 'worldGrid' is the joinMethodName for var PermitZones in parking.js.
exports.saveAndJoinTuples = function (arrayOfStuff, joinMethodNameOfSecondElementofEachTuple) {
  //input array of tuples [[worldGridObj,permitZoneObj],[worldGridObj,permitZoneObj],[worldGridObj,permitZoneObj]]
  console.log('adding', arrayOfStuff.length, 'tuples ...');
  var recursiveFn = function (i, promise) {

    promise = promise || null;

    if (i < 0) {  // base case
      return promise;
    }

    //console.log('processing point', i);

    // Call saveAndJoin, then return a promise when done, only then can the next call be made
    return exports.saveAndJoin(arrayOfStuff[i][0], arrayOfStuff[i][1], joinMethodNameOfSecondElementofEachTuple)
    .then(function (promise) {
      return recursiveFn(i - 1, promise);  //fyi, recursing with i value decreasing
    });

  };

  // Recursion is needed to make sure that the array of objects are joined synchronously
  return recursiveFn(arrayOfStuff.length - 1);
};

// Grab all the permit zones that are part of a particular world grid square
exports.grabRelatedPolygons = function (worldGridObj) {
  /*
  obj = {
   table: Author [bookshelf model],
   attrs:{name:"ted"}
  }
  */

  // Using the coordinates of a worldgrid square, find that square in the
  // permitzones.worldGrid join table and return the permit zones that match that worldgrid square
  return worldGridObj.table.where(worldGridObj.attrs).fetch({ withRelated: ['zones.worldGrid'] })  //application specific
  .then(function (worldGridCollection) {
    if (!worldGridCollection) {
      console.log('nothing to return');
      return null;
    }

    return worldGridCollection.related('zones');
  });
};
