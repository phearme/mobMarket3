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
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					callback((new window.DOMParser()).parseFromString(xhr.responseText, "text/xml"));
				} else {
					callback(false);
				}
			}
		};
		xhr.send(null);
	};

	return NewsReader;
}());