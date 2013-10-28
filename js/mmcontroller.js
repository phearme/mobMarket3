/*jslint browser:true*/

/*
document.addEventListener("deviceready", function () {
	"use strict";
*/
	var newsReader = new NewsReader();

	angular.module("mmapp", [])
	// main controller
	.controller("mmCtrl", function mmCtrl($scope) {
		"use strict";
		window.debugScope = $scope;
		$scope.screens = [
			{id: "search", label: "Search Quote", inMainMenu: true},
			{id: "news", label: "Financial News", inMainMenu: true},
			{id: "watchlist", label: "My Watch List", inMainMenu: true},
			{id: "about", label: "About", inMainMenu: true}
		];
		$scope.loading = false;
		$scope.selectedScreen = undefined;
		$scope.newsItems = [];
		$scope.searchStock = "";

		// external links in default browser
		$scope.openLink = function (link) {
			window.open(link, "_system");
		};

		// simple screen navigation helpers
		$scope.selectScreen = function (s) {
			if (!s) {
				$scope.selectedScreen = undefined;
				return;
			}
			if (typeof s === "string") {
				$scope.selectedScreen = JSON.parse(s);
			} else if (typeof s === "object") {
				$scope.selectedScreen = s;
			}
			switch ($scope.selectedScreen.id) {
			case "news":
				$scope.loading = true;
				newsReader.getNews(undefined, function (items) {
					$scope.$apply($scope.loading = false);
					if (items && items.length > 0) {
						$scope.$apply($scope.newsItems = items);
					}
				});
				break;
			}
		};
		$scope.goBack = function (f) {
			if (!f) { return; }
			var from = f;
			if (typeof f === "string") {
				from = JSON.parse(f);
			}
			switch (from.id) {
			case "search":
			case "news":
			case "watchlist":
			case "about":
				$scope.selectScreen(undefined);
				break;
			}
		};
	})
	// touch directive
	.directive("touchBtn", function () {
		"use strict";
		return function (scope, element, attrs) {
			var elm = element[0],
				touchstartEvent,
				touchmoveEvent,
				touchendEvent,
				restoreDefault = function () {
					elm.style.opacity = "1";
					elm.removeEventListener("touchstart");
					elm.removeEventListener("touchmove");
					elm.removeEventListener("touchend");
				};
			touchmoveEvent = function () {
				restoreDefault();
			};
			touchendEvent = function () {
				if (attrs.touchAction && scope[attrs.touchAction] && typeof scope[attrs.touchAction] === "function") {
					scope.$apply(scope[attrs.touchAction](attrs.touchBtn));
				}
				restoreDefault();
			};
			touchstartEvent = function () {
				elm.style.opacity = "0.6";
				elm.addEventListener("touchend", touchendEvent);
				elm.addEventListener("touchmove", touchmoveEvent);
			};
			elm.addEventListener("touchstart", touchstartEvent);
		};
	});
/*
}, false);
*/
