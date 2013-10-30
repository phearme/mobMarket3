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
		$scope.realTimeFrequency = 4500;
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
			if (phase && (phase.toString() === "$apply" || phase.toString() === "$digest")) {
				if (typeof fn === "function") { fn(); }
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
			$scope.selectedScreen = typeof s === "string" ? JSON.parse(s) : s;
			switch ($scope.selectedScreen.id) {
			case "news":
				$scope.loading = true;
				newsReader.getNews(undefined, function (items) {
					$scope.safeApply(function () { $scope.loading = false });
					if (items && items.length > 0) {
						$scope.safeApply(function () { $scope.newsItems = items });
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
				$scope.getQuoteTimeout = $scope.selectedStock = undefined;
			}
		};
		$scope.goBack = function (f) {
			if (!f) { return; }
			var from = typeof f === "string" ? JSON.parse(f) : f;
			$scope.loading = false;
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
					var stockData;
					if (data && data.query && data.query.results && data.query.results.quote && $scope.selectedStock) {
						$scope.safeApply(function () {
							$scope.selectedStock.stockData = data.query.results.quote;
							$scope.loading = false;
							console.log($scope.selectedStock.stockData);
						});
					}
				});
				$scope.safeApply(function () {
					$scope.getQuoteTimeout = window.setTimeout($scope.fetchQuoteData, $scope.realTimeFrequency);
				});
			}
		};

		// opens up the detail stock screen and starts up fetching quotes data
		$scope.selectStock = function (stock) {
			if (!stock) {
				$scope.selectedScreen = undefined;
				return;
			}
			$scope.loading = true;
			$scope.selectedStock = typeof stock === "string" ? JSON.parse(stock) : stock;
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
						$scope.safeApply(function () { $scope.searchResults = data });
					} else {
						$scope.safeApply(function () { $scope.searchResults = [] });
					}
				});
			} else {
				$scope.safeApply(function () { $scope.searchResults = [] });
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
