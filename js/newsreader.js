var NewsReader = (function () {
	"use strict";

	function NewsReader() {
		this.rssUrl = "https://news.google.com/news/section?pz=1&cf=all&topic=b&output=rss";
	}

	NewsReader.prototype.getNews = function (search, callback) {
		var xhr = new XMLHttpRequest(),
			url = this.rssUrl + "&nocache=" + (new Date()).getTime().toString();
		if (search) {
			url += "&q=" + search;
		}
		xhr.open("GET", url, true);
		xhr.onreadystatechange = function () {
			var data, itemNodes, items = [], i, j,
				item, titleNode, linkNode, pubDate, description,
				parsedDesc, descImages, descFonts, fontTagOccurance;
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					data = (new window.DOMParser()).parseFromString(xhr.responseText, "text/xml");
					itemNodes = data.getElementsByTagName("item");
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
						callback(items);
					} else {
						callback(false);
					}
				} else {
					callback(false);
				}
			}
		};
		xhr.send(null);
	};

	return NewsReader;
}());