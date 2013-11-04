/*jslint browser:true*/
/*global console, angular, NewsReader, YAHOO, YQuotes, google*/
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
		{id: "about", label: "About", inMainMenu: true},
		{id: "chart", label: "", inMainMenu: false}
	];
	$scope.chartLength = {
		"1w": 7,
		"1m": 30,
		"3m": 90,
		"6m": 180,
		"1y": 365
	};
	$scope.loading = false;
	$scope.selectedScreen = undefined;
	$scope.selectedStock = undefined;
	$scope.newsItems = [];
	$scope.searchResults = [];
	$scope.searchStock = "";
	$scope.stockDetailsTimerOn = false;
	$scope.getQuoteTimeout = undefined;
	$scope.showExtended = false;
	$scope.selectedHistory = "1m";
	$scope.chartData = [[]];
	$scope.chart = undefined;

	// secure apply (prevent "digest in progress" collision)
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

	$scope.selectScreenById = function (id, preserveContext) {
		$scope.screens.filter(function (s) {
			return s.id === id;
		}).forEach(function (s) {
			$scope.selectScreen(s, preserveContext);
			return;
		});
	};

	$scope.goBack = function (f) {
		if (!f) { return; }
		var from = typeof f === "string" ? JSON.parse(f) : f;
		$scope.loading = false;
		switch (from.id) {
		case "stockDetails":
			// todo: handle when stock is in watch list
			$scope.selectScreenById("search", true);
			break;
		case "chart":
			$scope.selectStock($scope.selectedStock);
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
		$scope.selectScreenById("stockDetails");
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

	$scope.fetchHistoryData = function () {
		$scope.safeApply(function () {
			$scope.chartData = [[]];
		});
		YQuotes.getQuoteHistory($scope.selectedStock.symbol, $scope.chartLength[$scope.selectedHistory], function (data) {
			console.log(data);
			var chartData = [[]],
				i,
				tick,
				dateTab;
			if (data && data.query && data.query.results && data.query.results.quote) {
				for (i = 0; i < data.query.results.quote.length; i += 1) {
					tick = data.query.results.quote[i];
					dateTab = tick.Date ? tick.Date.split("-") : tick.col0.split("-");
					chartData.push([new Date(dateTab[0], dateTab[1] - 1, dateTab[2]).getTime(), window.parseFloat(tick.Close || tick.col1)]);
				}
				$scope.safeApply(function () {
					$scope.chartData = chartData;
					$scope.loading = false;
				});
			} else {
				// try again
				$scope.fetchHistoryData();
			}
		});
	};

	$scope.selectedStockAction = function (action) {
		switch (action) {
		case "chart":
			$scope.loading = true;
			$scope.fetchHistoryData();
			$scope.selectScreenById(action);
			break;
		case "news":
			$scope.selectScreenById(action);
			break;
		}
	};

	$scope.setChartLength = function (length) {
		$scope.loading = true;
		$scope.selectedHistory = length;
		$scope.fetchHistoryData();
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

	$scope.getChartButtonClass = function (key) {
		return key === $scope.selectedHistory ? "chartButtonSelected" : "chartButton";
	};

	// handle device back button
	document.addEventListener("backbutton", function () {
		$scope.safeApply(function () {
			$scope.goBack($scope.selectedScreen);
		});
	}, false);
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

// chart directive
mmapp.directive("drawChart", function () {
	"use strict";
	return function (scope, element, attrs) {
		scope.$watch("chartData", function () {
			scope.safeApply(function () {
				scope.chart = $.plot(
					$("#divChart"),
					[{data: scope.chartData, lines: {show: true}}],
					{
						xaxis: {mode: "time", show: true, font: {color: "#ffffff"}},
						yaxis: {show: true, font: {color: "#ffffff"}},
						grid: {
							backgroundColor: {colors: ["#606060", "#000000"]},
							minBorderMargin: 2,
							borderWidth: 1,
							axisMargin: 4
						}
					}
				);
			});
		});
	};
});

document.addEventListener("deviceready", function () {
	"use strict";

	angular.bootstrap(document, ["mmapp"]);

}, false);
