//parse.parseView = function(el);
var dataX = window.dataX;
//var parse = dataX.parse;
function ViewBuilder(el) {
	this.el = el;

	//The generated source will replace TPL_{vars.key} with the value of vars[key]
	var TPL_vars = {
		bindMethods: null,
		namespace: null,
		render: null,
		msg: null
	};

	this.namespace = TPL_vars.namespace=el.getAttribute('data-x-view');
	this.bindSrc = []; // Source code to be attached to the document.
	this.bindId = 0; // An id number for unique bind functions in this view class.
	this.msg = {}; // A text dictionary for translations.

	//.vars - array to hold preprocessing vars for substition
	// ${VAR:n} will be replaced with contents of .vars[n]
	this.vars = [];
	this.parseAttrs(); // Parse data-x attributes and data-x-bind functions.

	TPL_vars.bindMethods = this.bindSrc.join('\n\n') + "\n\n";
	var src = el.innerHTML;
	el.innerHTML = ""; // clear for doc view

	try {
		src = dataX.parse.commentScript(src, this); // Parse bind language to <?...?> for tmpl parser
	} catch (err) {
		console.log("View '" + this.namespace + "': Error parsing view render.\n\n" + src);
		throw(err);
	}

	try {
		TPL_vars.render = dataX.parse.tmpl(src, this.namespace); // Parse <?..?> to javascript
	} catch (err) {
		console.log("View '" + this.namespace + "': Error parsing template. \n\n" + src);
		throw(err);
	}

	var fn = null;

	TPL_vars.msg=JSON.stringify(this.msg);
	// bindMethods, render, namespace, msg

	src = dataX.parse.setTPL(TPL_vars, ViewBuilder.viewTemplate);

	console.log(src);

	try {
		dataX.parsing++;
		var script = document.createElement("script");
		script.type="text/javascript";
		try {
			script.appendChild(document.createTextNode(src+'\ndataX.parsing--'));
		} catch (e) {
			script.text = src+'\ndataX.parsing--';
		}
		document.body.appendChild(script);
	} catch (err) {
		console.log('Error creating view class "' + this.namespace + '". \n\n' + err);
		fn = new Function ("","return 'ERROR';");
	}
}

ViewBuilder.prototype.parseAttrs = function() {
	var baseElement = this.el;
	var nextIter = 0;

	var list = dataX.getByAttr(baseElement, '[data-on-dblclick]');

	for (var i = 0, len = list.length; i < len; i++) {
		var el = list[i];
		var value = el.getAttribute('data-on-dblclick');
		value = "if (dataX.dbl(this)) \{ " + value + "; \}";
		el.setAttribute('data-el-onclick', value); 
	}

	var list = dataX.getByAttr(baseElement, '[data-x-checked]');

	for (var i = 0, len = list.length; i < len; i++) {
		var el = list[i];
		var value = el.getAttribute('data-x-checked');
		value = "{{(" + value + ") ? 'checked=\\'yes\\'' : ''}}";
		el.setAttribute('data-x-checked', value);
	}

	var list = dataX.getByAttr(baseElement, '[data-x-if]');

	for (var i = 0, len = list.length; i < len; i++) {
		var el = list[i];
		var beginIf = "<!--?\n\tif (" + dataX.htmlDecode(el.getAttribute('data-x-if')) + ") { //data-x-if \n\t\t?-->";
		var endIf = "<!--?\n\t}  //end data-x-if \n\n\t?-->";
		el.insertAdjacentHTML('beforebegin', beginIf);
	
		var sib = el;
		var last = el;
	
		while(sib !== null) {

			sib = sib.nextSibling;

			if (sib === null || sib.nodeType !== 1) {
				continue; // only concerned with element nodes
			} else if (sib.hasAttribute('data-x-else')) {
				var elseStr = sib.getAttribute('data-x-else');
				if (elseStr !== "") {
					// todo: clean code for comment script (-- to -\-)
					beginElse = "<!--?\n\t} else if (" + dataX.htmlDecode(elseStr) + ") { // data-x-else \n\t\t?-->";
				} else {
					beginElse = "<!--?\n\t} else { // data-x-else \n\t\t?-->";
				}

				sib.insertAdjacentHTML('beforebegin', beginElse);
				last = sib; // last sibling element
			} else {
				sib = null; // not an else node
			}
		}

		last.insertAdjacentHTML('afterend', endIf);
	}

	var list = dataX.getByAttr(baseElement, 'script[type="text/xo-js"]'); //script[type="text/xo-js"]');

	for (var i = 0, len = list.length; i < len; i++) {
		var el = list[i];
		var source = "<!--?" + el.innerHTML.replace(/--/g,"-\\-") + "?-->";
		el.outerHTML = source;
	}

  // data-x-msg Makes a dictionary entry for key with the value of the innerHTML or attribute.
  // data-x-msgn="key,attribute:key"
  // The parsing process adds a refId for variable substitution
	var list = dataX.getByAttr(baseElement, '[data-x-msg]');
	var origin = dataX.locale;// TODO: dataX.locale should be replaced with module locale.
	if (typeof this.msg[origin] === "undefined") {
		this.msg[origin] = {}; // create dictionary if it doesn't exist.
	}
	for(var i = 0, len=list.length; i < len; i++) {
		var el=list[i];
		var keys = el.getAttribute('data-x-msg').split(',');
		var dataMsg = [];
		for (var j =0, jlen=keys.length; j < jlen; j++) {
			var pair = keys[j].split(':');
			var varIndex = this.vars.length;
			if (pair.length === 1) {// innerHTML
				var key = pair[0];
				var msg = dataX.parse.parseMsg(el.innerHTML);
				var attrName = '';
				el.innerHTML="{{this.content('" + origin + "','" + key + "',this.vars[" + varIndex + "])}}";
			} else if(pair.length === 2) {// attribute:key
				// if data-el-attr exists wrap.. else grab el.attr, wrap and put into data-el-attr
				var elAttr = 'data-el-'+pair[0];
				var key = pair[1];
				var attr = (el.hasAttribute(elAttr)) ? el.getAttribute(elAttr) : el.getAttribute(pair[0]);
				var msg = dataX.parse.parseMsg(attr);
				var attrName = pair[0] + ':';
				attr = "{{this.content('" + origin + "','" + key + "',this.vars[" + varIndex + "])}}"
				el.setAttribute(elAttr,attr);
			}
			if (typeof this.msg[origin][key] !== "undefined") {
				console.log('NOTICE: ' + this.namespace + '.msg["' + key + '"] exists. Key should only be defined once.');
			}
			this.vars[varIndex] = msg.vars;
			this.msg[origin][key]=[adler32(msg.text),msg.text];
			dataMsg.push(key+":" + attrName + "{{VAR:"+varIndex+"}}"); // will parse to  ${this.vars[varIndex]=dataX.ref(ViewClass.vars[varIndex])}
		}
		el.setAttribute("data-x-msg",dataMsg.join(','));
	}

	var list = dataX.getByAttr(baseElement, '[data-x-each]');

	for (var i = 0, len = list.length; i < len; i++) {
		var el = list[i];
		var str = el.getAttribute('data-x-each')
		var parts = str.split(':');
		if (parts.length !== 2) {
			console.log('data-x-each should be arrName:item not "' + str + '"');
			continue; // bad syntax
		}
		var arrName = parts[0];
		var itemName = parts[1];
		parts = dataX.parse.setTPL({
			arr: parts[0],
			item: parts[1],
			name: parts[0].replace(/\./g,"_") // array name for iter and len
		}, ViewBuilder.eachTemplate).split('TPL_SPLIT');
		el.insertAdjacentHTML('afterbegin', dataX.parse.toCommentScript(parts[0]));
		el.insertAdjacentHTML('beforeend', dataX.parse.toCommentScript(parts[1]));
	}

  // data-x-each="arrName:itemName"
  // var arrName_len = arrName.length;
  // var arrName_i = 0;

  var list = dataX.getByAttr(baseElement, '[data-x-js]');

  for (var i = 0, len = list.length; i < len; i++) {
	var el = list[i];
	var js = el.getAttribute('data-x-js'); // htmlDecode?
	// Comments do not allow "--".
	js = js.replace("--", "-\\-"); //.trim();
	var beginJs = "<!--? " + js + " { ?-->";
	var endJs = "<!--? } ?-->";

	// if and else statments surround element.
	if (js.substr(0,2) === 'if') {
	  // insertBefore
	  el.insertAdjacentHTML('beforebegin', beginJs);
	  el.insertAdjacentHTML('afterend', endJs);
	} else if (js.substr(0,4) === 'else') {
	  // Text can not be output between if and else statements.
	  // If the prevous node is a text node clear text.(?non whitespace)
	  if (el.previousSibling.nodeType === 3) { 
		el.previousSibling.nodeValue = "";
	  }
	  el.insertAdjacentHTML('beforebegin', beginJs);
	  el.insertAdjacentHTML('afterend', endJs);
	} else {
	  // for loops put the statement inside of the element.
	  el.insertAdjacentHTML('afterbegin', beginJs);
	  el.insertAdjacentHTML('beforeend',endJs);
	}
  }
  
	// bind elements to variables
	var bindElements = dataX.getByAttr(baseElement, '[data-x-bind]');
	var i = bindElements.length;

	while(i--) {
		this.doBind(bindElements[i], false);
	}

	if (!baseElement.getAttribute) return;
	var baseBind = baseElement.getAttribute('data-x-bind');
	if (baseBind !== "" && baseBind !== null) {
		this.doBind(baseElement, true);
	}
};


ViewBuilder.prototype.doBind = function(el, isBaseElement) {
	var varName = el.getAttribute('data-x-bind');
	if (varName.charAt(0) === '@') {
		this.bindList(varName, el, isBaseElement);
	} else {
		this.bindEl(varName, el, false, isBaseElement);
	}

	el.setAttribute('data-x-isbound', 'yes'); // set an attribute telling wrapping nodes this is bound.
	el.innerHTML = "<!-- bind complete -->"; // remove template contents to prevent wrapping nodes from processing.
};

ViewBuilder.prototype.bindList = function(varName, el, isBaseElement) {
    // @varName:itemName - shorthand bind foreach
    var parts = varName.substring(1).split(':');
    
    if (parts.length !== 2) {
    	console.log('Wrong bind syntax. ' + varName);
    	return;
    }

    // Replacements for TPL_varname, and TPL_itemname.
    var reps = {
      varname: parts[0],
      itemname: parts[1]
    };

    var filter = el.getAttribute('data-x-filter');
    reps.filter = (filter) ? "if(!("+filter+"))continue;" : "";

    // TODO: Explore idea of using a ref for item to allow for changing
    // value of item reference and binding instead of iteration index/key.
    /*
    if (el.hasAttribute('data-x-ref') && el.getAttribute('data-x-ref') === 'true') {
      reps.itemvalue = "dataX.ref(" + reps.itemname + ")"
    } else {
      reps.itemvalue = "'" + reps.varname + "[' + _index_ + ']'"
    }
    */

    var parts = dataX.parse.setTPL(reps, ViewBuilder.bindTemplate).split('TPL_SPLIT');
    el.insertAdjacentHTML('afterbegin', dataX.parse.toCommentScript(parts[0]));
    el.insertAdjacentHTML('beforeend', dataX.parse.toCommentScript(parts[1]));
    this.bindEl(reps.varname, el, true, isBaseElement);
};

ViewBuilder.prototype.bindEl = function(varName, el, hasLoop, isBaseElement) {
  // Should local name default to the last name from namespace.something.varName?
  var localName = null; // Local name for global var if exists.
  var sep = varName.indexOf(':'); // Seperator for localName

  // If there is a seperator then extract the localName.
  if (sep > 0) {
      localName = varName.substr(sep + 1);
      varName = varName.substr(0,sep);
  }

  var bindId = this.bindId++;
  var fnStr = this.namespace + ".bind[" + bindId + "]";


  // x-bindto is set in order to use varName:localName and @varName:iterName
  // We only search data-x-bindto for root variable name.
  el.setAttribute('data-x-bindto', varName);

  if (isBaseElement === true) {
  	// bind function is a prototype so it does not exist.
    //el.setAttribute('data-x-bindfn', el.getAttribute('data-x-view') + '.bind_' + bindId);
    el.setAttribute('data-x-bindfn', '_view_.bind_' + bindId);
  } else {
    el.setAttribute('data-x-bindfn', "{{this.id}}.bind_" + bindId);
    el.outerHTML = "{{this.bind_" + bindId + "()}}";
  }

  var fnsrc = el.outerHTML;
  var id = el.getAttribute('id');
  var src  = "";
  src = dataX.parse.commentScript(fnsrc, this); // Parse bind language to <?...?> for tmpl parser      
  src = dataX.parse.tmpl(src, id); // Parse <?..?> to javascript

  if (localName !== null) {
    src = "var " + localName + " = " + varName + ";\n" + src;
  }

  var srcHeader =  this.namespace + ".prototype.bind_" + bindId + " = function(";
  srcHeader += (hasLoop === true) ? "_index_" : "";
  srcHeader += "){\n\t";
  src = srcHeader + src + "\n};";
  this.bindSrc.push(src);
};

/**** TEMPLATES ****/


// A list bind template that allows for setting an index to render
// one item if needed. Also has filter applied in render loop.
ViewBuilder.bindTemplate = dataX.parse.tplFn(function () {
	var _single_ = false;
	var _len_ = 0;
	var _k_;
	var _items_ = TPL_varname;

	if (typeof _index_ !== 'undefined') {
		// Render index.
		RET = '';
		_len_ = parseInt(_index_) + 1;
		_single_ = true;
	} else {
		var _index_ = 0;
		// Render list.
		if( Object.prototype.toString.call(TPL_varname) !== '[object Array]' && TPL_varname !== null) {
			// Not an array and not null, assume it's an object.
    		_items_ = [];
    		// TODO: option to sort object keys.
    		for (_k_ in TPL_varname) _items_.push(_k_);
		}
		_len_ = _items_.length;
	}
	  
	for (_index_; _index_ < _len_; _index_++){
		TPL_filter
		var TPL_itemname = _items_[_index_];
		TPL_SPLIT
	}

	if (_single_ === true) {
		if (typeof _ctrl_ !== 'undefined') {
			return RET.replace(/_ctrl_/g, _ctrl_._ctrl_);
		}
		return RET;
	}
});

ViewBuilder.eachTemplate = dataX.parse.tplFn(function() {
	for (var TPL_item_i=0,TPL_item_len=TPL_arr.length; TPL_item_i < TPL_item_len; TPL_item_i++) {
		var TPL_item = TPL_arr[TPL_item_i];
		TPL_SPLIT
	}
});

// viewSrc - template source code for creating a view class.
// TPL_variables are replaced.
ViewBuilder.viewTemplate = dataX.parse.tplFn(function() {
  /*******************************
  * xo compiled view
  * TPL_namespace 
  *******************************/

  dataX.namespace('TPL_namespace', function(el,controller) {
	this.className = 'TPL_namespace';
	this.id = dataX.ref(this); // TODO: look at changing .id to ._view_ to match ._ctrl_ pattern
	this.vars = []; // a place to hold refIds for language parameters
	this.locale=dataX.locale;
	var self = this;

	if (typeof el !== "undefined" && el !== null) {
	  this.el = el;
	  el.setAttribute('data-x-id', this.id);
	  this.refresh = function() {self.el.innerHTML=self.render();};
	} else {
	  this.el = null;
	  this.refresh = function() {return self.render();};
	}

	if (typeof controller !== 'undefined' && controller !== null) {
	  this.controller = controller;
	  if (el !== null && typeof controller.onViewInit !== "undefined") {
		controller.onViewInit(this);
	  }
	  /*
		if (el.hasAttribute('data-x-init')) {
		  var d = dataX.dot(el.getAttribute('data-x-init'));
		  d.obj[d.key](this); // TODO: should we do a check for true / false to render the element?
		}
	  */ 
	}
	
	this.refresh();
  });

  /*******************************
  * Bind Methods
  *******************************/

  TPL_bindMethods

  /*******************************
  * Render
  *******************************/

  TPL_namespace.prototype.render = function() {
	TPL_render
  };

  TPL_namespace.prototype.getData = function(defaults) {
	return dataX.getData(this.el, defaults);
  };

  /*******************************
  * Translation 
  *******************************/

  TPL_namespace.prototype.content = function(locale, key, refId) {
	var mylang = this.msg[locale];
	var origin = this.msg[this.locale];
	if(typeof origin === 'undefined') return '?'; // the origin language is not set.
	var reg = /{([0-9]*)}/g;
	var vars = xDoc.ids[refId];
	if (typeof vars === 'undefined') vars = []; // should this throw an error?
	var text = '';

	function replacer(match, $1) {
	  return vars[$1];
	}

	if (typeof mylang==='undefined') {
	  console.log(this.className + '. Locale "' + locale + '" not found.');
	  text = origin[key][1];
	} else if(typeof mylang[key] === 'undefined') {
	  console.log(this.className + '. No translation for "' + locale + '","' + key + ".");
	  text = origin[key][1];
	} else if(mylang[key][0] !== origin[key][0]) {
	  console.log(this.className + '. Checksum missmatch with origin "' + this.locale + '","' + key + '".');
	  text = origin[key][1];
	} else {
	  text = mylang[key][1]
	}

	text = text.replace(/data-el-/g,'');
	if (typeof this.controller !== 'undefined') {
	  text = text.replace(/_ctrl_/g, this.controller._ctrl_);
	}
	// replace variables {0},{1},{2}, etc. if exists
	if (typeof vars !== 'undefined' && vars.length > 0) {
	  return text.replace(reg, replacer);
	}
	return text;
  };

  TPL_namespace.prototype.msg = TPL_msg;
  // Load any languages that were set prior to class creation.
  dataX.loadLanguage('TPL_namespace', TPL_namespace.prototype.msg);
});