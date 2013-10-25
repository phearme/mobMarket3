/*jslint browser:true*/

/*
document.addEventListener("deviceready", function () {
	"use strict";
*/
	angular.module("mmapp", [])
	// main controller
	.controller("mmCtrl", function mmCtrl($scope) {
		"use strict";
		window.debugScope = $scope;
		$scope.mainMenu = [
			{name: "Search Quote", target: "search"},
			{name: "Financial News", target: "news"},
			{name: "My Watch List", target: "watchlist"},
			{name: "About", target: "about"}
		];
		$scope.screens = {
			search: {label: "Search Quote", inMainMenu: true},
			news: {label: "Financial News", inMainMenu: true},
			watchlist: {label: "My Watch List", inMainMenu: true},
			about: {label: "About", inMainMenu: true}
		};
		$scope.selectedScreen = undefined;
		$scope.selectScreen = function (s) {
			$scope.selectedScreen = s;
		};
	})
	// touch directive
	.directive("touchBtn", function () {
		"use strict";
		function restoreDefault(e) {
			e.style.opacity = "1";
			e.removeEventListener("touchmove");
			e.removeEventListener("touchend");
		}

		return function (scope, element, attrs) {
			var elm = element[0];
			elm.removeEventListener("touchstart");
			elm.addEventListener("touchstart", function () {
				elm.style.opacity = "0.7";
				elm.addEventListener("touchend", function () {
					if (attrs.touchAction && scope[attrs.touchAction] && typeof scope[attrs.touchAction] === "function") {
						scope.$apply(scope[attrs.touchAction](JSON.parse(attrs.touchBtn)));
					}
					restoreDefault(elm);
				});
				elm.addEventListener("touchmove", function () {	restoreDefault(elm); });
			});
		};
	});
/*
}, false);
*/