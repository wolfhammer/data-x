//parse view into comment script <!--? javascript ?--> ${js} ${=js} ${#js}
//parse comment script into template <?js?> <?=js?> <?==js?> <?#js?>
//parse template into javascript function

function ParseDataX() {

};

// creates comment script <!--? str ?--> with escaped -- as -\-
ParseDataX.prototype.toCommentScript = function (str) {
	if (typeof str === "undefined") return "";
	return "<!--? " + str.replace(/--/g,'-\\-') + " ?-->"
};

ParseDataX.prototype.init = function() {
	this.parseViews(document);
};

ParseDataX.prototype.jsStr = function(str) {
	return str.replace(/['\n\r\\]/g,function(m){
		if (m==='\n') return '\\n'
		if (m==='\r') return '\\r'
		return '\\'+m
	});
};

ParseDataX.prototype.findOrphans = function(baseElement) {
	// parse orphaned data-x-binds into views
	var id = 0;
	var bindElements = dataX.getByAttr(baseElement, '[data-x-bind]');
	var orphans = {};
	dataX.namespace("app._orphan", orphans);
	for (var i = bindElements.length-1; i > -1; i--) {
		var el = bindElements[i];
		console.log(el);
		el.setAttribute('data-x-view', 'app._orphan.view_' + id++);
		el.setAttribute('data-x-ctrl', ""); // will not activate without a controller :|
		new ViewBuilder(el);
	}
};

ParseDataX.prototype.parseViews = function(baseElement) {

	// list of element nodes that matched the query
	var viewElements = dataX.getByAttr(baseElement, '[data-x-view]');

	// Process views inside out.
	for (var i = viewElements.length-1; i > -1; i--) {
		new ViewBuilder(viewElements[i]);
	}

	// If the baseElement itself is a view then parse.
	// must have getAttribute ability.
	if (!baseElement.getAttribute) {
		this.findOrphans(baseElement);
		return;
	}

	var xView = baseElement.getAttribute('data-x-view');

	if (xView !== null && xView !== "") {
		new ViewBuilder(baseElement);
	} else {
		this.findOrphans(baseElement);
	}

};

// parses str "My string ${var1} ${var2}"
//["string {1} {2}", [var1,var2,etc]]
ParseDataX.prototype.parseMsg = function(str) {
	var n=0,vars=[];
	// replaces xo vars with parameters
	//str = str.replace(/\\*\${([^}]*)}/g, function(match, $1) {
	//str = str.replace(/\\*\$\{([^~][^\}]*)\}|\\*\$\{~((?:[^~]|~[^}])*)~\}/g,function(match,$1,$2){
	//str = str.replace(/\\*\$\{([^\/][^}]*)}|\\*\$\{\/((?:[^\/]|\/[^}])*)\/}/g,function(match,$1,$2){
	str = str.replace(/\\*\{\{(?:[^}\\]*|\\.)*\}\}/g,function(match){
		var c0=match.charAt(0)
		var i = 0;
		if (c0 === '\\') {
			var escaped = true, i=1
			while(match.charAt(i++) === '\\')escaped=!escaped
			if(escaped)return match
		}
		match=match.replace(/\\}/g, "}");
		vars.push('(' + match.substring(i+2,match.length-2) + ')');
		return "{" + n++ + "}";
	});
	return {text:str,vars:vars}
};

ParseDataX.prototype.commentScript = function(src, ViewClass) {
	// Convert data-el-* properties to property names.
	// Template syntax is not safe for all attribute values so we use data-el-*.
	src = src.replace(/data-el-/g,'');

	// convert xo-checked to html checked.
	src = src.replace(/data-x-checked="([\s\S]*?)"/g,"$1");

	// Commented js will escape -- with -\-. Change back to --.
	// {...} will convert only if there is no ';' or '{'
	//src = src.replace(/\\*<!--\?([\s\S]*?)\?-->|\\*\$\{([^\}]*)\}/g, function(match, $1, $2, offset, original) {
	//src = src.replace(/\\*<!--\?([\s\S]*?)\?-->|\\*\$\{([^~][^\}]*)\}|\\*\$\{~((?:[^~]|~[^}])*)~\}/g, function(match, $1, $2, $3, offset, original) {
	//src = src.replace(/\\*<!--\?([\s\S]*?)\?-->|\\*\$\{([^\/][^}]*)}|\\*\$\{\/((?:[^\/]|\/[^}])*)\/}/g, function(match, $1, $2, $3, offset, original) {
	src = src.replace(/\\*<!--\?(?:[\s\S]*?)\?-->|\\*\{\{(?:[^}\\]*|\\.)*\}\}/g,
	function(match, offset, original) {
		///\$({([^}\\]|\\.)*})*/g
		var c0=match.charAt(0)
		var i = 0;

		if (c0 === '\\') {
			var escaped = true, i=1;
			while(match.charAt(i++) === '\\')escaped=!escaped;
			if(escaped)return match;
		}

		// ${~...~} allows using {}, usefull when calling a function with json parameter.
		// ${~fn({key:value})~}
		// ${...} does not allow for {}
		//if($3) $2 = $3;
		if (match.charAt(i)==='{') { // <-- need to see if we matched ${..}
			match=match.replace(/\\}/g, "}");
			// script, deocode  encoded > < & signs.

			// ${...} length-1, {{...}}length-2
			match = match.substring(i+2, match.length-2);
			if (match.charAt(0) === '#') {
				return "<?" + match + "?>";
			} else if (match.substr(0,4) === 'VAR:') {
				// ${VAR:n} - ViewClass.vars index for language variable substitution.
				// Parses to <?=this.vars[n]=dataX.ref([var1,var2,etc])?>
				//
				// Example:
				// <p data-x-msg="hello">Hello ${firstName}!</p>
				//
				// Parses to something like:
				//   this.vars[0] = 'R99_';
				//   this.msg['eng']['hello'] = 'Hello {0}';
				//   dataX.refs['R99_'] = ['Tony'];
				//   RET += '<p data-x-msg="hello:' + this.vars[0] + ">' +
				//   this.content('eng','hello',this.vars[0]) + '</p>';
				//
				// Output is:
				//   <span data-x-msg="hello:R99_">Hello Tony!</span>
				//
				// On dataX.setLocale(lang) we use R99_ to get the variables back for substituion. This allows for
				// changing language without re-render and may be good for faster translations by allowing
				// fast switching to check against original. Another goal is to allow for translation
				// dictionaries to be contributed to modules.  The author only needs to add the data-x-msg
				// attribute to open up translation contributions.  Attributes can also be defined with the
				// syntax attribute:key and multiples with with ',' seperator.
				// <p data-x-msg="hello,title:hi_title" title="Hello to you">Hello ${firstName}</p>
				var index = parseInt(match.substr(4));
				return "<?=this.vars["+index+"]=dataX.ref([" + ViewClass.vars[index].join(",") + "]).split('.')[2]?>"
			} else {
				return "<?=" + dataX.htmlDecode(match) + "?>";
			}
		} else {
			match = match.substring(i+5, match.length-4);
			return "<?" + match.replace(/-\\-/g, "--") + "?>";
		}
	});
	
	return src;
};

// convert template <? ?> to javascript. 
ParseDataX.prototype.tmpl = function(src, templateName) {
	/* Template syntax when inside of
	 * Javascript: <? // javascript ?>
	 * Print raw value: <?=varname?>
	 * Print html encoded value: <?==varname?>
	 * Print reference to object <?#varname?>
	 */
			
	var i = 0;
	var js = "\n";
	// make $controller reference if this.controller exists.
	js += "\tif (typeof this.controller !== 'undefined') {var _ctrl_ = this.controller;}\n";
	js += "\tvar RET = '";
	var self = this;
	// We use [\s\S] to get everything.
	src.replace(/<\?([\s\S]*?)\?>/g, function(match, $1, offset){ //, original) {
		
		var str = src.slice(i, offset); //.trim();
		
		if (str != '') js += self.jsStr(str);// encode text

		switch($1.charAt(0)) {
			
			case '=': // add to text buffer
				if ($1.charAt(1) === '=') { // encode html <?==myar?>
					js += "' + dataX.htmlEncode(" + $1.slice(2) + ") + '";
				} else { // raw <?=myvar?>
					js += "' + (" + $1.slice(1) + ") + '";
				}
				break;

			case '#': // creates a reference
				js += "' + dataX.ref(" + $1.substr(1) + ") + '";
				break;

			default:
				js += "';" + $1 + ";RET += '";// JavaScript
		}

		i = offset + match.length;
	});
	
	var txt = src.slice(i);
	if (txt.length > 0) js += self.jsStr(txt);// encode text

	js += "';\n;"
	js += "if (typeof _ctrl_ !== 'undefined') {\n"; // _ctrl_ to namespace
	js += "\t;RET = RET.replace(/_ctrl_/g, _ctrl_._ctrl_);\n";
	js += "}\n";
	js += "return RET;"

	return js;
};


// return the contents of a function as a template string.
ParseDataX.prototype.tplFn = function(fn) {
	return fn.toString().replace(/^function[^\{]*\{([\s\S]*)}$/,"$1");  
};

// variable substitution - replaces TPL_key with vars[key] 
ParseDataX.prototype.setTPL = function(vars, tplSrc) {
	var keys=[];
	for (k in vars) keys.push(k);
	var str = 'TPL_(' + keys.join('|') + ')';
	var re = new RegExp(str,'g')
	return tplSrc.replace(re, function(match, $1) {
		for (k in vars) if ($1 === k) return vars[k];
		return $1
	});
};

//http://stackoverflow.com/questions/421419/good-choice-for-a-lightweight-checksum-algorithm
function adler32(d) {
	for(var i=0,a=1,b=0,m=65521,l=d.length;i<l;)a+=d.charCodeAt(i++),b+=a;
	return ((b%m)<<16)|(a%m);
}

if (typeof dataX === "undefined") {
	console.error("Include dataX.js before dataX.parse.")
} else {
	dataX.parse = new ParseDataX();
}