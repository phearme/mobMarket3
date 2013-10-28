var YFStock = (function () {
	"use strict";

	function YFStock() {
		this.searchUrl = "http://autoc.finance.yahoo.com/autoc?callback=YAHOO.Finance.SymbolSuggest.ssCallback";
	}

	return YFStock;
}());