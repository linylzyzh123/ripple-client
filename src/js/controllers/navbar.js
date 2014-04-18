/**
 * NAVBAR
 *
 * The navbar controller manages the bar at the top of the screen.
 */

var Amount = ripple.Amount,
    rewriter = require('../util/jsonrewriter');

var module = angular.module('navbar', []);

module.controller('NavbarCtrl', ['$scope', '$element', '$compile', 'rpId',
                                 'rpNetwork',
                                 function ($scope, el, $compile, $id,
                                           network)
{
  var queue = [];
  var tickInterval = 4000;
  var tickUpcoming = false;

  var tplAccount = require('../../jade/notification/account.jade');

  // Activate #status panel
  $scope.toggle_secondary = function () {
    $scope.show_secondary = !$scope.show_secondary;
  };

  $scope.$watch('balances', function () {
    $scope.orderedBalances = _.filter($scope.balances, function (balance) {
      // XXX Maybe we should show zero balances if there is outgoing trust in
      //     that currency.
      return !balance.total.is_zero();
    });
    $scope.orderedBalances.sort(function(a,b){
      return parseFloat(Math.abs(b.total.to_text())) - parseFloat(Math.abs(a.total.to_text()));
    });

    $scope.balance_count = $scope.orderedBalances.length;
  }, true);

  // Username
  $scope.$watch('userCredentials', function(){
    var username = $scope.userCredentials.username;
    $scope.shortUsername = null;
    if(username && username.length > 25) {
      $scope.shortUsername = username.substring(0,24)+"...";
    }
  }, true);

  $scope.logout = function () {
    // logout() assumes that we are outside of an Angular $apply(), so we need
    // to make sure that's actually the case otherwise we may get a
    // "Error: $apply already in progress"
    // XXX: Find out if there is a recommended/better way of doing this.
    setImmediate(function () {
      $id.logout();
    });
  };

  $scope.$on('$netConnected', function (e) {
    setConnectionStatus(true);
  });

  $scope.$on('$netDisconnected', function (e) {
    setConnectionStatus(false);
  });

  $scope.$watch('events', function(events) {
    $scope.notifications = events.slice(0,10);
  }, true);

  /**
   * Marks all the notifications as seen.
   */
  $scope.read = function() {
    // don't do anything if account is unfunded
    if (!$scope.notifications.length)
      return;

    var lastTxDate = $scope.notifications[0].date;

    if ($scope.unseen > 0) {
      $scope.unseen = 0;
    }

    if (($scope.userBlob.data.lastSeenTxDate || 0) < lastTxDate) {
      // Remember last seen date
      $scope.userBlob.set("/lastSeenTxDate", lastTxDate);

      // Reset the counter
      $scope.unseen = $scope.unseenNotifications.count;
      $scope.unseenNotifications.count = 0;

      // Set seen for all the events
//      _.each($scope.events, function(event){
//        event.unseen = false;
//      })
    }
  };

  /**
   * Graphically display a network-related notifications.
   *
   * This function does no filtering - we assume that any transaction that makes
   * it here is ready to be rendered by the notification area.
   *
   * @param {Object} e Angular event object
   * @param {Object} tx Transaction info, returned from JsonRewriter#processTxn
   */

// VH: Hiding this for now.
//  $scope.$on('$appTxNotification', function (e, tx) {
//    var $localScope = $scope.$new();
//    $localScope.tx = tx.tx;
//
//    var html = tplAccount($localScope);
//
//    if (html.length) {
//      var msg = $compile(html)($localScope);
//      enqueue(msg);
//    }
//  });

  function setConnectionStatus(connected) {
    $scope.connected = !!connected;
    if (connected) {
      notifyEl.find('.type-offline').remove();
    } else {
      notifyEl.append('<div class="notification active type-offline">OFFLINE</div>');
    }
  }

  // A notification might have been queued already before the app was fully
  // initialized. If so, we display it now.
  if (queue.length) tick();

  var notifyEl = $('<div>').attr('id', 'notification').insertAfter(el);

  // Default to disconnected
  setTimeout(function() {
    setConnectionStatus($scope.connected);
  }, 1000 * 3);

  /**
   * Add the status message to the queue.
   */
  function enqueue(msg)
  {
    queue.push(msg);
    if (!tickUpcoming) {
      setImmediate(tick);
    }
  }

  /**
   * Proceed to next notification.
   */
  var prevEl = null;
  function tick()
  {
    if (prevEl) {
      // Hide notification box
      prevEl.removeClass('active');
      var prevElRef = prevEl;
      setTimeout(function () {
        prevElRef.remove();
      }, 1000);
      prevEl = null;
    }

    tickUpcoming = false;
    if (queue.length) {
      // Ensure secondary currencies pulldown is closed
      $scope.$apply(function() {
        $scope.show_secondary = false;
      });

      // Show next status message
      var next = queue.shift();

      var el = $(next);
      el.addClass('notification');
      el.appendTo(notifyEl);
      setImmediate(function () {
        el.addClass('active');
      });

      prevEl = el;

      tickUpcoming = true;
      setTimeout(tick, tickInterval);
    }
  }

  // Testing Hooks
  this.setConnectionStatus = setConnectionStatus;
  this.enqueue             = enqueue;
  this.tick                = tick;
}]);
