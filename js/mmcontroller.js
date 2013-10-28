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

		// new data callback
		$scope.onGetNewsData = function (data) {
			var itemNodes = data.getElementsByTagName("item"), items = [],
				i, j, item, titleNode, linkNode, pubDate, description,
				parsedDesc, descImages, descFonts, img, fontTagOccurance;
			$scope.$apply($scope.loading = false);
			if (itemNodes && itemNodes.length > 0) {
				for (i = 0; i < itemNodes.length; i += 1) {
					item = {};
					titleNode = itemNodes[i].getElementsByTagName("title");
					if (titleNode && titleNode.length > 0) { item.title = titleNode[0].textContent; }
					linkNode = itemNodes[i].getElementsByTagName("link");
					if (linkNode && linkNode.length > 0) { item.link = linkNode[0].textContent; }
					pubDate = itemNodes[i].getElementsByTagName("pubDate");
					if (pubDate && pubDate.length > 0) { item.pubDate = pubDate[0].textContent; }
					description = itemNodes[i].getElementsByTagName("description");
					if (description && description.length > 0) {
						parsedDesc = (new window.DOMParser()).parseFromString(description[0].textContent, "text/xml");
						descImages = parsedDesc.getElementsByTagName("img");
						if (descImages && descImages.length > 0) {
							for (j = 0; j < descImages.length; j += 1) {
								if (descImages[j].getAttribute("src") && descImages[j].getAttribute("src") !== "") {
									item.image = descImages[j].getAttribute("src");
									break;
								}
							}
						}
						descFonts = parsedDesc.getElementsByTagName("font");
						if (descFonts && descFonts.length > 0) {
							fontTagOccurance = 0;
							for (j = 0; j < descFonts.length; j += 1) {
								if (descFonts[j].getAttribute("size") === "-1") {
									fontTagOccurance += 1;
									if (fontTagOccurance === 2) {
										if (descFonts[j].textContent.length > 0) {
											item.content = descFonts[j].textContent;
										}
										break;
									}
								}
							}
						}
					}
					items.push(item);
				}
			}
			if (items.length > 0) {
				$scope.$apply($scope.newsItems = items);
			}
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
				newsReader.getNews(undefined, $scope.onGetNewsData);
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
		function restoreDefault(e) {
			e.style.opacity = "1";
			e.removeEventListener("touchmove");
			e.removeEventListener("touchend");
		}

		return function (scope, element, attrs) {
			var elm = element[0];
			elm.removeEventListener("touchstart");
			elm.addEventListener("touchstart", function () {
				elm.style.opacity = "0.6";
				elm.addEventListener("touchend", function () {
					if (attrs.touchAction && scope[attrs.touchAction] && typeof scope[attrs.touchAction] === "function") {
						scope.$apply(scope[attrs.touchAction](attrs.touchBtn));
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