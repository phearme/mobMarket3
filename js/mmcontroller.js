/*jslint browser:true*/
/*global console, angular, NewsReader, YAHOO, YQuotes, google*/
var newsReader = new NewsReader(),
	googleChartReady = false;

google.load("visualization", "1", {packages: ["corechart"]});
google.setOnLoadCallback(function () {
	googleChartReady = true;
});

document.addEventListener("deviceready", function () {
	"use strict";

var mmapp = angular.module("mmapp", ["ngSanitize"]);
// main controller
mmapp.controller("mmCtrl", function mmCtrl($scope) {
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
	$scope.selectedHistory = "1w";
	$scope.dataTable = undefined;

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
		case "chart":
			$scope.loading = true;
			YQuotes.getQuoteHistory($scope.selectedStock.symbol, $scope.chartLength[$scope.selectedHistory], function (data) {
				var dataTable = new google.visualization.DataTable(),
					i,
					tick,
					dateTab;
				dataTable.addColumn("date", "Date");
				dataTable.addColumn("number", "Tick");
				console.log(data);
				if (data && data.query && data.query.results && data.query.results.quote) {
					for (i = 0; i < data.query.results.quote.length; i += 1) {
						tick = data.query.results.quote[i];
						dateTab = tick.Date.split("-");
						dataTable.addRow([new Date(dateTab[0], dateTab[1] - 1, dateTab[2]), window.parseFloat(tick.Close)]);
					}
				}
				$scope.safeApply(function () {
					$scope.dataTable = dataTable;
					$scope.loading = false;
				});
			});
			$scope.screens.filter(function (s) {
				return s.id === action;
			}).forEach(function (s) {
				$scope.selectScreen(s);
			});
			break;
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

	// handle device back button
	document.addEventListener("backbutton", function () {
		$scope.safeApply(function () {
			$scope.goBack($scope.selectedScreen);
		});
	}, false);
});

// touch directive
mmapp.directive("touchBtn", function () {
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
mmapp.directive("drawCanvas", function () {
	return function (scope, element, attrs) {
		scope.$watch("dataTable", function () {
			var chartOptions = {
					legend: {position: "none"},
					backgroundColor: "#000000",
					colors: ["#FFD800"],
					hAxis: {
						textStyle: {
							color: "#ffffff"
						}
					},
					vAxis: {
						textStyle: {
							color: "#ffffff"
						}
					}
				},
				chart;
			if (googleChartReady && scope.dataTable) {
				chart = new google.visualization.LineChart(element[0])
				chart.draw(scope.dataTable, chartOptions);
			}
		});
	};
});

angular.bootstrap(document, ["mmapp"]);

}, false);
