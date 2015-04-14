function xoHigh(str,init) {
	//return; // skip for debugging
	// return nothing on init else highlight
	if (init === true) {
		xoHigh.addStyles();
		return ""
	}
	return xoHigh.obj.color(str);	
}

xoHigh.prototype.color = function(str) {
	var r=this.re;
	var lastIndex = 0;
	var newStr = ""

	function tag(str) {
		return str.replace(r.tag, function(match,x,s,tag,body,e){
			return x+"<div class='tag'>"+s+"<span class='tag'>" + tag + '</span>' + body.replace(r.attr, "$1<span class='attr'>$2</span>$3<span class='value'>$4</span>")+e+'</div>'; 
		});
	}

	str.replace(r.com,function(match,com,offset){
		var before = str.substring(lastIndex,offset);
		lastIndex=offset+match.length;
		newStr+=tag(before);
		var type=(com.charAt(7)==='?')?'xo':'comment'; // &lt;--?
		newStr+="<span class='"+type+"'>" + com + "</span>";
		return match;
	});
	
	// get the final offset
	newStr+=tag(str.substr(lastIndex));
	// add zero width space to ${...} and data-el to prevent parsing
	newStr=newStr.replace(r.xo,"<span class='xo'>{{\u200b$1}}</span>");
	newStr=newStr.replace(/(data-el)/g,"$1\u200B");
	newStr=newStr.replace(r.keyword, "<span class='keyword'>_$1_</span>");
	//newStr=newStr.replace(/xo([-.])/g,"<b>xo</b>$1");
	//newStr=newStr.replace(r.set,"<span class='xo'>$1</span>");
	return newStr
}

xoHigh.prototype.re={
	tag:/((?:[^&]|&[^l])*)(&lt;\/{0,1})([a-zA-Z0-9_]+)((?:[^&]|&[^g])*)(&gt;)/g,
	attr:/(\s*)([a-zA-Z0-9_-]+)(\s*=\s*)(&quot;(?:[^\\&]|\\&quot;|&amp;|&#\d+;)*&quot;)/g,
	xo:/\{\{([\s\S]*?)\}\}/g,
	com:/(\/\/.*$|&lt;!--(?:[^-]|-[^-])*--&gt;|\/\*(?:[^*]|\*[^\/])*\*\/)/gm,
	set:/(dataX\.set\([^)]*\))/g,
	keyword:/_(ctrl)_/g
	
};

xoHigh.addStyles = function() {
	var style=(function(){/*START
	<style>
	pre.data-x-source {background-color:#f9f9f9;}
	div.tag {display:inline;color:#0000ff;}
	span.keyword {font-weight:bold;color:#FF00FF;}
	span.attr {color:#FF0000;}
	span.value {color:#000099;}
	span.tag {color:#AA0000;}
	span.xo {background-color:#ffdaff; color:#333333;}
	span.xo-alt3 {background-color:#AAF6ff; color:#444444}
	span.xo-alt2{background-color:#fff685;color:#444444}
	span.xo-alt{background-color:#FFFA55;}
	span.comment {color:#009900;}
	span.data-x-value {background-color:#FFCCFF;color:blue;}
	span.data-x-attr {color:#FF3ACC;}
	.xohi {
		font-family:monospace;
		font-size:15px;
		line-height:16px;
		word-wrap:break-word;
		display:inline-block;
	}
	.x-numbers {
		padding:0px 5px 0px 10px;
		margin:0 5px 0 0;
		text-align:right;
		float:left;
		background-color-old:#f6f3ef;
		background-color-old-2:#f6fcff;
		border:0;
		color:#AAAAAA;
	}
	</style>
	END*/}).toString().replace(/[\s\S]*START|END[\s\S]*/g,""); 
	document.head.insertAdjacentHTML('afterbegin', style);
	return "";
};

xoHigh.viewSrc = function() {
	var list = dataX.getByAttr(document,"[data-x-src]");
	for (var i=0,len=list.length;i<len;i++){
		var el=list[i];
		var id=el.getAttribute("data-x-src");
		var srcEl = document.getElementById(id);
		var html=srcEl.outerHTML||dataX.outerHTML(srcEl);
		html=dataX.htmlEncode(html);
		if (!el.hasAttribute("class"))el.className="xohi";
		el.innerHTML=xoHigh(html);
	}
};

xoHigh.xoExample = function() {
	var list = dataX.getByAttr(document,"[class='data-x-example']");
	for (var i=0,len=list.length;i<len;i++){
		var el=list[i];
		var html = el.innerHTML;

		// Count number of tabs after first new line and trim that from the
		// start of each line.
		var j=html.indexOf('\n')+1;
		var tabs = 0;
		while (html.charAt(j++)=='\t') tabs++;
		if (tabs > 0) {
			var r = new RegExp("^\\t{"+tabs+"}","gm");
			html = html.replace(r,"");
		}

		var html=dataX.htmlEncode(html);
		html = xoHigh(html);
		var pre = document.createElement("pre");
		pre.className='data-x-source';
		var lineNumbersHtml = "<code class='xohi x-numbers'>\n";
		var lines = el.innerHTML.split(/\n/g).length - 1;
		for (var j = 1; j < lines; j++) {
			lineNumbersHtml += j + "\n";
		}
		lineNumbersHtml += "\n</code>"
		pre.innerHTML = lineNumbersHtml + "<code class='xohi'>"+html+"</code>";
		el.appendChild(pre)
	}
};

// create an object we can use xoHigh directly
xoHigh.obj = new xoHigh("",true);