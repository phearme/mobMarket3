/*jslint browser:true*/
var YQuotes = {
	quotesCallback: undefined,
	quotesUrl: "http://query.yahooapis.com/v1/public/yql?format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=YQuotes.quotesCallback",
	getQuote: function (symbols, callback) {
		"use strict";
		var url = this.quotesUrl + "&q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(",
			i,
			script = document.createElement("script");
		for (i = 0; i < symbols.length; i += 1) {
			url += i === 0 ? "\"" + symbols[i] + "\"" : ",\"" + symbols[i] + "\"";
		}
		url += ")";
		this.quotesCallback = callback;
		try {
			script.setAttribute("src", url);
			document.getElementsByTagName("head")[0].appendChild(script);
		} catch (e) {
			if (typeof this.quotesCallback === "function") {
				this.quotesCallback(false);
			}
		}
	}
};
