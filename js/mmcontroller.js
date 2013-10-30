/*jslint browser:true*/
/*global NewsReader, YAHOO, YQuotes*/

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
			{id: "stockDetails", label: "", inMainMenu: false},
			{id: "news", label: "Financial News", inMainMenu: true},
			{id: "watchlist", label: "My Watch List", inMainMenu: true},
			{id: "about", label: "About", inMainMenu: true}
		];
		$scope.loading = false;
		$scope.selectedScreen = undefined;
		$scope.selectedStock = undefined;
		$scope.newsItems = [];
		$scope.searchResults = [];
		$scope.searchStock = "";
		$scope.getQuoteTimeout = undefined;

		// secure apply (prevent digest in progress collision)
		$scope.safeApply = function (fn) {
			var phase = this.$root.$$phase;
			if (phase == "$apply" || phase == "$digest") {
				if (fn && typeof fn === "function") {
					fn();
				}
			} else {
				this.$apply(fn);
			}
		};

		// external links in default browser
		$scope.openLink = function (link) {
			window.open(link, "_system");
		};

		// simple screen navigation helpers
		$scope.selectScreen = function (s, preserveContext) {
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
					$scope.safeApply($scope.loading = false);
					if (items && items.length > 0) {
						$scope.safeApply($scope.newsItems = items);
					}
				});
				break;
			case "search":
				if (!preserveContext) {
					$scope.safeApply(function () {
						$scope.searchStock = "";
						$scope.searchResults = [];
					});
				}
				break;
			}
			if ($scope.selectedScreen.id !== "stockDetails") {
				window.clearTimeout($scope.getQuoteTimeout);
			}
		};
		$scope.goBack = function (f) {
			if (!f) { return; }
			var from = f;
			if (typeof f === "string") {
				from = JSON.parse(f);
			}
			switch (from.id) {
			case "stockDetails":
				// todo: handle when stock is in watch list
				$scope.screens.filter(function (s) {
					return s.id === "search";
				}).forEach(function (s) {
					$scope.selectScreen(s, true);
				});
				break;
			case "search":
			case "news":
			case "watchlist":
			case "about":
				$scope.selectScreen(undefined);
				break;
			}
		};

		// starts up fetching quotes data and set refresh frequency
		$scope.fetchQuoteData = function () {
			if ($scope.selectedStock) {
				YQuotes.getQuote([$scope.selectedStock.symbol], function (data) {
					console.log("get quote callback", data);
					$scope.safeApply($scope.getQuoteTimeout = window.setTimeout($scope.fetchQuoteData, 4000));
				});
			}
		};

		// opens up the detail stock screen and starts up fetching quotes data
		$scope.selectStock = function (stock) {
			if (!stock) {
				$scope.selectedScreen = undefined;
				return;
			}
			if (typeof stock === "string") {
				$scope.selectedStock = JSON.parse(stock);
			} else if (typeof stock === "object") {
				$scope.selectedStock = stock;
			}
			// fetch quotes
			$scope.fetchQuoteData();

			// show details screen
			$scope.screens.filter(function (s) {
				return s.id === "stockDetails";
			}).forEach(function (s) {
				$scope.selectScreen(s);
			});
		};

		// triggered when search quote has changed
		$scope.searchChange = function () {
			if ($scope.searchStock !== "") {
				YAHOO.search($scope.searchStock, function (data) {
					if (data) {
						//console.log(data);
						$scope.safeApply($scope.searchResults = data);
					} else {
						$scope.safeApply($scope.searchResults = []);
					}
				});
			} else {
				$scope.safeApply($scope.searchResults = []);
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
					elm.removeEventListener("touchmove", touchmoveEvent);
					elm.removeEventListener("touchend", touchendEvent);
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
