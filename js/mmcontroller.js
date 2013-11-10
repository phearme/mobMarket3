/*jslint browser:true*/
/*global console, angular, NewsReader, YAHOO, YQuotes, google, $*/
var newsReader = new NewsReader(),
	mmapp = angular.module("mmapp", ["ngSanitize"]);

// main controller
mmapp.controller("mmCtrl", function mmCtrl($scope) {
	"use strict";
	var i;
	$scope.realTimeFrequency = 4500;
	window.debugScope = $scope;
	$scope.screens = [
		{id: "search", label: "Search Quote", inMainMenu: true},
		{id: "stockDetails", label: "", inMainMenu: false},
		{id: "news", label: "Financial News", inMainMenu: true},
		{id: "watchlist", label: "Watch List", inMainMenu: true},
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
	$scope.chartLengthOrdered = [];
	for (i in $scope.chartLength) {
		if ($scope.chartLength.hasOwnProperty(i)) {
			$scope.chartLengthOrdered.push({key: i, value: $scope.chartLength[i]});
		}
	}
	$scope.chartLengthOrdered.sort(function (a, b) {
		return a.value < b.value ? -1 : 1;
	});
	$scope.loading = false;
	$scope.selectedScreen = undefined;
	$scope.selectedStock = undefined;
	$scope.newsItems = [];
	$scope.searchResults = [];
	$scope.searchStock = "";
	$scope.stockDetailsTimerOn = false;
	$scope.watchlistTimerOn = false;
	$scope.getQuoteTimeout = undefined;
	$scope.watchlistTimeout = undefined;
	$scope.showExtended = false;
	$scope.selectedHistory = "1m";
	$scope.chartData = [[]];
	$scope.chart = undefined;
	$scope.watchlist = JSON.parse(window.localStorage.getItem("watchlist")) || [];
	if ($scope.watchlist.length === 0) {
		$scope.watchlist = $scope.previousVersionWatchlist();
	}

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
		case "watchlist":
			if ($scope.watchlist.length > 0) {
				$scope.loading = true;
			}
			$scope.watchlistTimerOn = true;
			$scope.fetchWatchListData();
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
			if ($scope.selectedStock && $scope.isInWatchList($scope.selectedStock.symbol)) {
				$scope.selectScreenById("watchlist");
			} else {
				$scope.selectScreenById("search", true);
			}
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
		case "watchlist":
			window.clearTimeout($scope.watchlistTimeout);
			$scope.watchlistTimeout = undefined;
			$scope.watchlistTimerOn = false;
			$scope.selectScreen(undefined);
			break;
		case "search":
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

	// fetches quotes data for watchlist
	$scope.fetchWatchListData = function () {
		var watchlistSymbols = [], i;
		if ($scope.watchlistTimerOn) {
			for (i = 0; i < $scope.watchlist.length; i += 1) {
				watchlistSymbols.push($scope.watchlist[i].symbol);
			}
			if (watchlistSymbols.length > 0) {
				YQuotes.getQuote(watchlistSymbols, function (data) {
					var j, k;
					console.log(data);
					if (data && data.query && data.query.count && data.query.results && data.query.results.quote) {
						$scope.safeApply(function () {
							if (data.query.count === 1) {
								for (j = 0; j < $scope.watchlist.length; j += 1) {
									if ($scope.watchlist[j].symbol === data.query.results.quote.symbol) {
										$scope.watchlist[j].stockData = data.query.results.quote;
									}
								}
							} else if (data.query.count > 1) {
								for (k = 0; k < data.query.results.quote.length; k += 1) {
									for (j = 0; j < $scope.watchlist.length; j += 1) {
										if ($scope.watchlist[j].symbol === data.query.results.quote[k].symbol) {
											$scope.watchlist[j].stockData = data.query.results.quote[k];
										}
									}
								}
							}
							$scope.loading = false;
						});
					}
				});
			}
			$scope.safeApply(function () {
				$scope.watchlistTimeout = window.setTimeout($scope.fetchWatchListData, $scope.realTimeFrequency);
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

	$scope.isInWatchList = function (symbol) {
		var i;
		for (i = 0; i < $scope.watchlist.length; i += 1) {
			if ($scope.watchlist[i].symbol === symbol) {
				return true;
			}
		}
		return false;
	};

	$scope.selectedStockAction = function (action) {
		var i;
		switch (action) {
		case "chart":
			$scope.loading = true;
			$scope.fetchHistoryData();
			$scope.selectScreenById(action);
			break;
		case "news":
			$scope.selectScreenById(action);
			break;
		case "watchlist":
			if ($scope.isInWatchList($scope.selectedStock.symbol)) {
				$scope.safeApply(function () {
					i = $scope.watchlist.length - 1;
					while (i >= 0) {
						if ($scope.watchlist[i].symbol === $scope.selectedStock.symbol) {
							$scope.watchlist.splice(i, 1);
						}
						i -= 1;
					}
				});
			} else {
				$scope.safeApply(function () { $scope.watchlist.push($scope.selectedStock); });
			}
			window.localStorage.setItem("watchlist", JSON.stringify($scope.watchlist));
			$scope.selectScreenById("watchlist");
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

	$scope.previousVersionWatchlist = function () {
		var wlSymbols = [], i, glob_watchListPrefix = "watch://", data;
		for (i = 0; i < window.localStorage.length; i += 1) {
			if (window.localStorage.key(i).indexOf(glob_watchListPrefix) >= 0) {
				data = JSON.parse(window.localStorage.getItem(window.localStorage.key(i)));
				if (data && data.symbol && data.title) {
					wlSymbols.push({symbol: data.symbol, name: data.title});
				}
			}
		}
		return wlSymbols;
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
