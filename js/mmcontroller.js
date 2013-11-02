/*jslint browser:true*/
/*global console, angular, NewsReader, YAHOO, YQuotes*/

var newsReader = new NewsReader(),
	mmapp = angular.module("mmapp", ["ngSanitize"]);
// main controller
mmapp.controller("mmCtrl", function mmCtrl($scope) {
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
	$scope.stockDetailsTimerOn = false;
	$scope.getQuoteTimeout = undefined;
	$scope.showExtended = false;

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
		var newsSearch;
		if (!s || s === "") {
			$scope.selectedScreen = $scope.selectedStock = undefined;
			return;
		}
		$scope.selectedScreen = typeof s === "string" ? JSON.parse(s) : s;
		switch ($scope.selectedScreen.id) {
		case "news":
			$scope.loading = true;
			newsSearch = $scope.selectedStock ? $scope.selectedStock.name : undefined;
			newsReader.getNews(newsSearch, function (items) {
				$scope.safeApply(function () { $scope.loading = false; });
				if (items && items.length > 0) {
					$scope.safeApply(function () { $scope.newsItems = items; });
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
			$scope.getQuoteTimeout = undefined;
			$scope.stockDetailsTimerOn = false;
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
		case "news":
			if ($scope.selectedStock) {
				$scope.selectStock($scope.selectedStock);
			} else {
				$scope.selectScreen(undefined);
			}
			break;
		case "search":
		case "watchlist":
		case "about":
			$scope.selectScreen(undefined);
			break;
		}
	};

	// starts up fetching quotes data and set refresh frequency
	$scope.fetchQuoteData = function () {
		if ($scope.stockDetailsTimerOn) {
			YQuotes.getQuote([$scope.selectedStock.symbol], function (data) {
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
		$scope.stockDetailsTimerOn = true;
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
				$scope.safeApply(function () {
					$scope.searchResults = data || [];
				});
			});
		} else {
			$scope.safeApply(function () { $scope.searchResults = []; });
		}
	};

	$scope.selectedStockAction = function (action) {
		switch (action) {
		case "news":
			$scope.screens.filter(function (s) {
				return s.id === action;
			}).forEach(function (s) {
				$scope.selectScreen(s);
			});
			break;
		}
	};

	$scope.toggleExtended = function () {
		$scope.showExtended = !$scope.showExtended;
	};

	$scope.getDataCellClass = function (val) {
		if (!val) {
			return "dataCell";
		}
		if (val.indexOf("+") >= 0) {
			return "dataCellUp";
		}
		if (val.indexOf("-") >= 0) {
			return "dataCellDown";
		}
		return "dataCell";
	};
});

// touch directive
mmapp.directive("touchBtn", function () {
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
document.addEventListener("deviceready", function () {
	"use strict";
	alert("device ready");
*/
	angular.element(document).ready(function () {
		alert("angular dom ready");
		angular.bootstrap(document, ["mmapp"]);
	});
/*
}, false);
*/