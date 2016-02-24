'use strict';
angular.module('spotz.side', ['MapServices', 'SideServices'])

.controller('sideCtrl', ['$scope', '$rootScope', '$cookies', '$state', 'MapFactory', 'DrawingFactory', function ($scope, $rootScope, $cookies, $state, MapFactory, DrawingFactory) {

  // Add rule on click is hidden
  $scope.ShowAddRuleOnClick = false;
  $scope.showMobilePreview = false;
  $scope.preview = {};
  $scope.style = {};
  $scope.constraints = {};
  $scope.privileges = false;

  $scope.ShowAddFeatureMenu = false;

  //turn all modes on
  var mode = {
    addNewFeature:false,
    grid:false,
    meter:false,
    permit:false,
    sweep:false,
    mobile:false,
  };

  var enabledMode = '';

  var style = {
    true:'enabled',
    false:'',
  };

  $rootScope.$on('admin', function () {
    if ($cookies.get('privileges') === 'tasmanianDevils') {
      $scope.privileges = true;
    }
  });

  //set the initial default mobile preview contraints to the current time and day
  $scope.constraints = {
    date: new Date(),
    time: moment().format('H:mm'),
    duration: 1,
    text:'mobile',
  };

  $rootScope.constraints = $scope.constraints;

  //function that highlights buttons on the menubar
  //and executes any function related to that mode
  $scope.showOnly = function (newMode) {

    //turn off last mode
    if (enabledMode) {
      mode[enabledMode] = false;
      $scope.style[enabledMode] = style[mode[enabledMode]];
    }

    //turn on this mode
    mode[newMode] = true;

    //set newMode as the enabled mode
    enabledMode = newMode;

    //set the newMode
    $scope.style[newMode] = style[mode[newMode]];
    console.log(newMode);

    if (newMode === 'mobile' && !$scope.showMobilePreview) {
      //only run mode if mobile preview is not already clicked
      $scope.showMobilePreview = true;
      $scope.ShowAddFeatureMenu = false;
      DrawingFactory.addPolygonOnClick(false);

      $scope.showPreview();

    } else if (newMode === 'addNewFeature') {
      $scope.ShowAddFeatureMenu = true;
      DrawingFactory.addPolygonOnClick(true);
    } else {

      //hide the mobile preview menu
      $scope.showMobilePreview = false;
      $scope.ShowAddFeatureMenu = false;
      DrawingFactory.addPolygonOnClick(false);

      //set the root scope to the new mode so that we know
      //how to color newly fetched features
      $rootScope.constraints.text = newMode;

      //filter the results
      console.log('rootScope', $rootScope.constraints);
      MapFactory.filterFeatures($rootScope.constraints);
    }
  };

  //Runs the mobile preview code to change the features
  $scope.showPreview = function () {

    //set the rootscope so that other parts of the app know the set contraints
    $rootScope.constraints = $scope.constraints;

    //filter the results
    $rootScope.constraints.text = 'mobile';
    MapFactory.filterFeatures($rootScope.constraints);
  };

  //drops down the rule menu (not a mode)
  $scope.toggleAddRuleMenu = function () {
    //toggle drop down
    $scope.ShowAddRuleOnClick = !$scope.ShowAddRuleOnClick;
  };

  //saves a rule to the database
  $scope.addRule = function () {

    //make sure a polygon is selected
    if (MapFactory.selectedFeature && MapFactory.selectedFeature.id !== -1) {
      saveRule(MapFactory.selectedFeature.feature);
    } else {
      console.log('invalid polygon selected.  Try again. ');
    }
  };

  //save a newly drawn polygon
  $scope.savePolygon = function () {
    DrawingFactory.savePolygon();
  };

  //erase a newly drawn polygon
  $scope.erasePolygon = function () {
    DrawingFactory.erasePolygon();
  };

  //function to save a new rule to the currently selected feature
  //should be a service....
  var saveRule = function (feature) {

    if (window.confirm('Are you sure you want to change the rule?')) {

      if (!$scope.rule.permitCode) {
        console.log('permit code required');
        return;
      }

      if (!$scope.rule.color) {
        console.log('color required');
        return;
      }

      console.log('sending off rule', feature.getProperty('id').toString(), $scope.rule);

      MapFactory.sendRule(feature.getProperty('id').toString(), $scope.rule)
      .then(function (response) {
        console.log('here is the rule', response.data);
        var newRule = {
          id: response.data.id,
          permitCode:response.data.permitCode,
          days: response.data.days,
          timeLimit: response.data.timeLimit,
          startTime: response.data.startTime,
          endTime: response.data.endTime,
          costPerHour: response.data.costPerHour,
          color: response.data.color,
        };

        if (Array.isArray(feature.getProperty('rules'))) {
          feature.getProperty('rules').push(newRule);
        }else {
          feature.setProperty('rules', [newRule]);
        }

        MapFactory.refreshTooltipText(feature);

        console.log('\n\nUpdated rules are:', $scope.rule);

      })
      .catch(function (err) {
        console.log('saved failed', err);
      });
    }
  };

  //intially show the mobile preview
  $scope.showOnly('mobile');
},
]);
